export type FillResult = "filled" | "username-only" | "no-fields" | "wrong-page";

/**
 * Runs inside the page, so it must stay self-contained: Chrome serializes this
 * function and nothing from the surrounding module is available to it.
 */
export function fillLoginForm(username: string, password: string, expectedHost: string): FillResult {
  // The tab may have navigated between the popup opening and this running.
  if (location.hostname !== expectedHost || location.protocol !== "https:") return "wrong-page";

  const usable = (input: HTMLInputElement) => {
    const style = getComputedStyle(input);
    return (
      !input.disabled &&
      !input.readOnly &&
      input.getClientRects().length > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  };

  const setValue = (input: HTMLInputElement, value: string) => {
    // Calling the native setter lets frameworks such as React notice the change.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const inputs = [...document.querySelectorAll("input")].filter(usable);
  const passwordField = inputs.find((input) => input.type === "password");
  const isUsernameField = (input: HTMLInputElement) =>
    ["text", "email", "tel"].includes(input.type) &&
    /user|email|e-mail|login|account|conta|utilizador|identifier/i.test(
      `${input.name} ${input.id} ${input.autocomplete} ${input.placeholder} ${input.getAttribute("aria-label") ?? ""}`,
    );

  if (!passwordField) {
    // Two-step logins ask for the username first.
    const first = inputs.find(isUsernameField);
    if (!first) return "no-fields";
    setValue(first, username);
    first.focus();
    return "username-only";
  }

  const textFields = inputs.filter((input) => ["text", "email", "tel"].includes(input.type));
  const scope = passwordField.form;
  const candidates = scope ? textFields.filter((input) => input.form === scope) : textFields;
  const before = candidates.filter(
    (input) => input.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const usernameField = before.reverse().find(isUsernameField) ?? before[0];

  if (usernameField) setValue(usernameField, username);
  setValue(passwordField, password);
  passwordField.focus();
  return "filled";
}
