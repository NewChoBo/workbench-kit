import { useRef, useState, type DragEvent, type ReactNode, type Ref } from 'react';
import { SideBarViewFrame } from '../../layout/sidebar';
import { cx } from '../../utils/cx';
import { ChatComposer, type ChatComposerProps } from './ChatComposer';
import { ChatMessageList, type ChatMessageListProps } from './ChatMessageList';

export interface ChatPanelProps
  extends
    ChatMessageListProps,
    Pick<
      ChatComposerProps,
      | 'disabled'
      | 'commandLabel'
      | 'commandSuggestPopover'
      | 'isRunning'
      | 'onCancel'
      | 'onCommandClick'
      | 'onKeyDown'
      | 'onSubmit'
      | 'onValueChange'
      | 'placeholder'
      | 'showTools'
      | 'value'
    > {
  className?: string;
  composerRef?: Ref<HTMLTextAreaElement>;
  /** Label shown on the file-drop overlay. Defaults to "Drop files to attach". */
  filesDropLabel?: string;
  headerAddon?: ReactNode;
  /** Called when files are dropped onto the panel (disabled while `disabled` or `isRunning`). */
  onFilesDrop?: (files: File[]) => void;
  /**
   * Wrap or replace the default `<ChatMessageList />` so hosts can inject
   * hybrid timelines around the kit list.
   */
  renderMessageList?: (defaultList: ReactNode) => ReactNode;
  /**
   * Wrap or replace the default `<ChatComposer />` while keeping panel chrome
   * and file-drop overlay behavior.
   */
  renderComposer?: (defaultComposer: ReactNode) => ReactNode;
  title?: string;
}

function dataTransferHasFiles(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types).includes('Files');
}

export function ChatPanel({
  className,
  commandLabel,
  commandSuggestPopover,
  composerRef,
  filesDropLabel = 'Drop files to attach',
  headerAddon,
  onFilesDrop,
  renderComposer,
  renderMessageList,
  title = 'Chat',
  value,
  onValueChange,
  onSubmit,
  onCancel,
  onCommandClick,
  onKeyDown,
  placeholder,
  disabled,
  isRunning,
  showTools,
  ...messageListProps
}: ChatPanelProps) {
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const dropEnabled = Boolean(onFilesDrop) && !disabled && !isRunning;

  const resetFileDragState = () => {
    dragDepthRef.current = 0;
    setIsFileDragActive(false);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!dropEnabled || !dataTransferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsFileDragActive(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!dropEnabled || !dataTransferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!dropEnabled || !dataTransferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsFileDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!dropEnabled || !dataTransferHasFiles(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    resetFileDragState();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      onFilesDrop?.(files);
    }
  };

  const defaultMessageList = <ChatMessageList isStreaming={isRunning} {...messageListProps} />;
  const messageList = renderMessageList
    ? renderMessageList(defaultMessageList)
    : defaultMessageList;

  const defaultComposer = (
    <ChatComposer
      ref={composerRef}
      commandLabel={commandLabel}
      commandSuggestPopover={commandSuggestPopover}
      disabled={disabled}
      isRunning={isRunning}
      placeholder={placeholder}
      showTools={showTools}
      value={value}
      onCancel={onCancel}
      onCommandClick={onCommandClick}
      onKeyDown={onKeyDown}
      onSubmit={onSubmit}
      onValueChange={onValueChange}
    />
  );
  const composer = renderComposer ? renderComposer(defaultComposer) : defaultComposer;

  return (
    <div
      className={cx('chat-panel-drop-target', isFileDragActive && 'chat-panel-drop-target--active')}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <SideBarViewFrame
        className={cx('chat-sidebar-view', className)}
        footer={composer}
        footerPlacement="overlay"
        headerAddon={headerAddon}
        title={title}
      >
        {messageList}
      </SideBarViewFrame>
      {isFileDragActive ? (
        <div aria-hidden className="chat-panel-drop-overlay">
          {filesDropLabel}
        </div>
      ) : null}
    </div>
  );
}
