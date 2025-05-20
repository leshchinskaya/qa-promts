from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import sys

app = Flask(__name__)
CORS(app)

@app.route('/api/run-xray-script', methods=['POST'])
def run_xray_script():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    jira_url = data.get('jira_url')
    jira_username = data.get('jira_username')
    jira_password = data.get('jira_password')
    jira_project_key = data.get('jira_project_key')
    csv_data = data.get('csv_data')

    if not all([jira_url, jira_username, jira_password, jira_project_key, csv_data]):
        return jsonify({"error": "Missing required parameters: jira_url, jira_username, jira_password, jira_project_key, csv_data are all required."}), 400

    script_path = os.path.join(os.path.dirname(__file__), '..', 'tests-script', 'send_tests.py')
    python_executable = sys.executable 

    cmd = [
        python_executable,
        script_path,
        '--jira-url', jira_url,
        '--jira-username', jira_username,
        '--jira-password', jira_password,
        '--jira-project-key', jira_project_key
    ]

    try:
        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8'
        )
        stdout, stderr = process.communicate(input=csv_data)
        return_code = process.returncode

        return jsonify({
            "stdout": stdout,
            "stderr": stderr,
            "returncode": return_code
        })

    except FileNotFoundError:
        app.logger.error(f"Script or Python executable not found. Python: {python_executable}, Script: {script_path}")
        return jsonify({"error": f"Server configuration error: Script or Python executable not found.", "stdout": "", "stderr": "File not found error during subprocess execution.", "returncode": -1}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred: {str(e)}")
        return jsonify({"error": f"An unexpected server error occurred: {str(e)}", "stdout": "", "stderr": str(e), "returncode": -1}), 500

if __name__ == '__main__':
    # For development only. In production, use a WSGI server like Gunicorn.
    # Host 0.0.0.0 makes it accessible on the network, not just localhost.
    app.run(debug=True, host='0.0.0.0', port=5050) 