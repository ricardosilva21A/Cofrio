// An empty selection cannot be copied, so the clipboard is replaced with a single space.
const area = document.getElementById("clipboard") as HTMLTextAreaElement;
area.value = " ";
area.select();
document.execCommand("copy");
window.close();
