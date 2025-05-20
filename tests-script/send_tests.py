import csv
import requests
import base64
import json
import argparse
import sys

# === Настройки подключения к Jira ===
ISSUE_TYPE = "Test"  # Тип задачи для Xray

def create_issue(data, jira_url, jira_project_key, headers):
    summary = data['Summary'].strip()
    # Этот ID может отличаться для разных Jira инстансов.
    # Для Xray Test Step Field (по умолчанию)
    steps_field_id = "customfield_10204"

    steps = [
        {
            "fields": {
                "Action": data['Action'].strip(),
                "Data": data['Data'].strip(),
                "Expected Result": data['ExpectedResult'].strip()
            }
        }
    ]
    payload = {
        "fields": {
            "project": {"key": jira_project_key},
            "summary": summary,
            "description": data['Description'].strip(),
            "issuetype": {"name": ISSUE_TYPE},
            steps_field_id: steps,
            "priority": {"name": data.get('Priority', 'Medium').strip()},
            "labels": [l.strip() for l in data.get('Labels', '').split(',') if l.strip()],
            steps_field_id: {"steps": steps}
        }
    }

    response = requests.post(f"{jira_url}/rest/api/2/issue", headers=headers, json=payload)

    if response.status_code == 201:
        issue_key = response.json()['key']
        print(f"✅ Тест создан: {issue_key}")
    else:
        print(f"❌ Ошибка {response.status_code}: {response.text}")
        try:
            error_details = response.json()
            if "errorMessages" in error_details and error_details["errorMessages"]:
                print(f"   Сообщения об ошибках Jira: {', '.join(error_details['errorMessages'])}")
            if "errors" in error_details and error_details["errors"]:
                for field, message in error_details["errors"].items():
                    print(f"   Ошибка в поле '{field}': {message}")
        except json.JSONDecodeError:
            pass # response.text already printed

def load_and_create_from_stream(stream, jira_url, jira_username, jira_password, jira_project_key):
    auth_string = base64.b64encode(f"{jira_username}:{jira_password}".encode()).decode()
    headers = {
        "Authorization": f"Basic {auth_string}",
        "Content-Type": "application/json"
    }
    
    reader = csv.DictReader(stream, delimiter=';')
    for row in reader:
        create_issue(row, jira_url, jira_project_key, headers)

def main():
    parser = argparse.ArgumentParser(description="Import tests into Jira Xray from CSV data via stdin.")
    parser.add_argument("--jira-url", required=True, help="Jira instance URL (e.g., https://jira.example.com)")
    parser.add_argument("--jira-username", required=True, help="Jira username")
    parser.add_argument("--jira-password", required=True, help="Jira password")
    parser.add_argument("--jira-project-key", required=True, help="Jira project key (e.g., PRJ)")
    args = parser.parse_args()

    load_and_create_from_stream(sys.stdin, args.jira_url, args.jira_username, args.jira_password, args.jira_project_key)

if __name__ == "__main__":
    main()
