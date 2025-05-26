#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Создаёт Test-issues в Jira Xray для всех экранов (FRAME) файла Figma.
Python 3.9+  |  requests 2.31+
"""

import re
import pathlib
import base64
import argparse
import requests
from collections import defaultdict

OUT_DIR = pathlib.Path("figma_screens")
OUT_DIR.mkdir(exist_ok=True)

# Тип задачи для Xray
ISSUE_TYPE = "Test"

def _auth_header(jira_username: str, jira_password: str) -> dict:
    """Создает заголовок Basic Auth для Jira."""
    if not jira_username or not jira_password:
        raise ValueError("Jira username and password are required for authentication.")
    tok = base64.b64encode(f"{jira_username}:{jira_password}".encode()).decode()
    return {"Authorization": f"Basic {tok}"}

def _parse_file_key(url: str) -> str:
    """Извлекает FIGMA_FILE_KEY из URL Figma."""
    m = re.search(r"/(?:file|design|proto)/([^/]+)/", url)
    if m:
        return m.group(1)
    q = re.search(r"[?&]file-id=([^&]+)", url)
    if q:
        return q.group(1)
    raise ValueError("Не удалось извлечь FILE_KEY из URL Figma")

def _figma_get(figma_token: str, endpoint: str, **params) -> dict:
    """Выполняет GET-запрос к Figma API."""
    if not figma_token:
        raise ValueError("Figma token is required.")
    r = requests.get(
        f"https://api.figma.com/v1/{endpoint}",
        headers={"X-Figma-Token": figma_token},
        params=params
    )
    r.raise_for_status()
    return r.json()

def _collect_top_frames(
    figma_token: str,
    file_key: str,
    limit: int,
    banned_elements_str: str
) -> list[tuple[str, str]]:
    """
    Возвращает TOP `limit` кортежей (screen_name, node_id) с наибольшей площадью.
    """
    tree = _figma_get(figma_token, f"files/{file_key}")
    banned_keywords = [kw.strip().lower() for kw in banned_elements_str.split(',') if kw.strip()]
    seen, frames, dup_cnt = set(), [], defaultdict(int)

    def area(node) -> float:
        box = node.get("absoluteBoundingBox")
        return float(box["width"] * box["height"]) if box else 0.0

    def walk(node):
        if node["type"] == "FRAME":
            raw = node["name"].strip()
            if banned_keywords and any(b_kw in raw.lower() for b_kw in banned_keywords):
                return
            dup_cnt[raw] += 1
            safe = f"{dup_cnt[raw]:02d}_{raw}" if dup_cnt[raw] > 1 else raw
            frames.append((safe, node["id"], area(node)))
        for ch in node.get("children", []):
            walk(ch)

    for page in tree["document"]["children"]:
        walk(page)

    frames.sort(key=lambda t: t[2], reverse=True)
    return [(n, i) for n, i, _ in frames[:limit]]

def _download_png(
    figma_token: str,
    file_key: str,
    node_id: str,
    screen: str,
    figma_scale: int
) -> pathlib.Path | None:
    """Загружает PNG-изображение для указанного узла Figma."""
    resp = _figma_get(
        figma_token,
        f"images/{file_key}",
        ids=node_id,
        format="png",
        scale=figma_scale
    )
    img_data = resp["images"].get(node_id)
    if not img_data:
        return None
    path = OUT_DIR / f"{screen}.png"
    path.write_bytes(requests.get(img_data).content)
    return path

def _attach_file(
    jira_url: str,
    jira_username: str,
    jira_password: str,
    issue_key: str,
    file_path: pathlib.Path
) -> None:
    """Прикрепляет файл к задаче Jira."""
    with file_path.open("rb") as fh:
        files = {"file": (file_path.name, fh, "image/png")}
        requests.post(
            f"{jira_url}/rest/api/2/issue/{issue_key}/attachments",
            headers=_auth_header(jira_username, jira_password) | {"X-Atlassian-Token": "no-check"},
            files=files
        ).raise_for_status()

def _create_test_issue(
    jira_url: str,
    jira_username: str,
    jira_password: str,
    jira_project_key: str,
    figma_file_url: str,
    screen: str,
    node_id: str,
    png: pathlib.Path,
    feature_name: str | None
) -> str | None:
    """Создает Test Issue в Jira."""
    link = figma_file_url + (("&node-id=" + node_id) if '?' in figma_file_url else ("?node-id=" + node_id))
    desc = f"*Figma:* [{screen}|{link}]\n\n!{png.name}|width=600!"
    steps = [{
        "action":"Open implemented screen in application",
        "data":"", "result":"Design matches Figma mock-up pixel-perfect"
    }]
    summary = (feature_name + " – " if feature_name else "") + f"UI – {screen}"
    fields = {
        "project":{"key": jira_project_key},
        "summary": summary,
        "description":desc,
        "issuetype":{"name": ISSUE_TYPE},
        "labels":["design","ui"],
        "customfield_10204": steps
    }
    r = requests.post(
        f"{jira_url}/rest/api/2/issue",
        headers=_auth_header(jira_username, jira_password) | {"Content-Type": "application/json"},
        json={"fields": fields}
    )
    if r.status_code != 201:
        print(f"❌ Jira {r.status_code}: {r.text}")
        return None
    key = r.json()["key"]
    _attach_file(jira_url, jira_username, jira_password, key, png)
    print(f"✅ {key} создан для «{screen}»")
    return key

def main():
    parser = argparse.ArgumentParser(
        description="Создаёт Test-issues в Jira Xray для экранов файла Figma."
    )
    parser.add_argument("--figma-file-url", required=True, help="URL файла Figma")
    parser.add_argument("--figma-token", required=True, help="Токен Figma API")
    parser.add_argument("--figma-scale", type=int, default=1,
                        help="Масштаб экспорта PNG из Figma (default: 1)")
    parser.add_argument("--frame-limit", type=int, default=20,
                        help="Максимальное количество экранов для обработки (default: 20)")
    parser.add_argument("--jira-url", required=True, help="URL экземпляра Jira")
    parser.add_argument("--jira-username", required=True, help="Имя пользователя Jira")
    parser.add_argument("--jira-password", required=True, help="Пароль пользователя Jira")
    parser.add_argument("--jira-project-key", required=True,
                        help="Ключ проекта Jira (например, SURFQA)")
    parser.add_argument("--banned-elements", default="frame,form,icon",
                        help="Ключевые слова для исключения фреймов (через запятую)")
    parser.add_argument("--feature-name", default="",
                        help="Наименование фичи для добавления в начало названия теста")
    args = parser.parse_args()

    try:
        file_key = _parse_file_key(args.figma_file_url)
    except ValueError as e:
        print(f"Ошибка: {e}")
        return

    candidates = _collect_top_frames(
        args.figma_token,
        file_key,
        args.frame_limit,
        args.banned_elements
    )
    print(f"Отобрано TOP {len(candidates)} самых больших экранов")

    created = []
    for scr, node in candidates:
        png = _download_png(
            args.figma_token,
            file_key,
            node,
            scr,
            args.figma_scale
        )
        if not png:
            print(f"⨯ «{scr}» — без PNG, пропускаем")
            continue
        try:
            key = _create_test_issue(
                args.jira_url,
                args.jira_username,
                args.jira_password,
                args.jira_project_key,
                args.figma_file_url,
                scr,
                node,
                png,
                args.feature_name or None
            )
            if key:
                created.append(key)
        except Exception as e:
            print(f"❌ Ошибка для «{scr}»: {e}")

    if created:
        jql = "issuekey%20in%20(" + ",%20".join(created) + ")"
        print("\nСсылка на созданные задачи:")
        print(f"{args.jira_url}/issues/?jql={jql}")
    else:
        print("\nНе создано ни одной задачи.")

if __name__ == "__main__":
    main()