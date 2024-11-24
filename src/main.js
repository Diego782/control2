// src/main.js
export function sendCommand(command) {
    fetch(`http://3.23.99.134/send-command/${command}`)
        .then(response => response.text())
        .then(data => alert(data))
        .catch(error => console.error('Error:', error));
}