/**
 * @file 여러 화면에서 공유하는 작은 DOM 도우미. 상태 변경이나 판정 규칙은 포함하지 않습니다.
 * 문자열은 textContent로 넣어 HTML 태그가 아닌 글자로 표시합니다.
 */

// index.html의 id로 요소를 찾습니다. 해당 id는 View와 HTML 사이의 연결점입니다.
export function getElement(id) {
  return document.getElementById(id);
}

// 태그·선택적 텍스트·CSS 클래스로 요소를 만듭니다. innerHTML을 쓰지 않아 문구가 마크업으로 실행되지 않습니다.
export function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

// 문자열을 UTF-8 문서로 내려받습니다. 기본은 Markdown이고 진행 백업은 JSON MIME을 지정합니다.
export function downloadText(
  text,
  filename,
  mimeType = "text/markdown;charset=utf-8",
) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // 다운로드가 시작될 시간을 준 후 임시 Blob URL을 해제해 메모리를 돌려줍니다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
