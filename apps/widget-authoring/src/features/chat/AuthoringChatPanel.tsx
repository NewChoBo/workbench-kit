export function AuthoringChatPanel() {
  return (
    <div className="ui-authoring-chat-panel" data-testid="authoring-chat-panel">
      <header className="ui-authoring-chat-panel__header">
        <h2 className="ui-authoring-chat-panel__title">Chat</h2>
      </header>
      <div className="ui-authoring-chat-panel__body">
        <p className="ui-authoring-chat-panel__placeholder">
          Ask for layout help, widget suggestions, or step-by-step guidance. Chat integration coming
          soon.
        </p>
      </div>
    </div>
  );
}
