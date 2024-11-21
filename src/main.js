// src/main.js
export function sendCommand(command) {
    fetch(`/send-command/${command}`)
        .then(response => response.text())
        .then(data => alert(data))
        .catch(error => console.error('Error:', error));
}