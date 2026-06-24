import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { Button } from '../primitives/Button';
import type { ButtonProps } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { Field } from '../primitives/Field';
import type { FieldProps } from '../primitives/Field';
import { NumberInput } from '../primitives/NumberInput';
import { Select } from '../primitives/Select';
import { TextInput } from '../primitives/TextInput';
import type { ControlWidth } from '../primitives/TextInput';
import { cx } from '../utils/cx';

export type WorkbenchPropertyRowProps = FieldProps;

export function WorkbenchPropertyRow({ className, ...props }: WorkbenchPropertyRowProps) {
  return <Field className={cx('ui-workbench-property-row', className)} {...props} />;
}

export interface WorkbenchPropertyTextRowProps extends Omit<WorkbenchPropertyRowProps, 'children'> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onValueChange?: (value: string) => void;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

export function WorkbenchPropertyTextRow({
  controlWidth = 'full',
  disabled,
  htmlFor,
  onValueChange,
  placeholder,
  readOnly,
  value,
  ...props
}: WorkbenchPropertyTextRowProps) {
  const generatedId = useId();
  const inputId = htmlFor ?? generatedId;

  return (
    <WorkbenchPropertyRow htmlFor={inputId} {...props}>
      <TextInput
        controlWidth={controlWidth}
        disabled={disabled}
        id={inputId}
        placeholder={placeholder}
        readOnly={readOnly}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyNumberRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | string | undefined;
  value?: number | undefined;
}

export function WorkbenchPropertyNumberRow({
  controlWidth = 'full',
  disabled,
  htmlFor,
  max,
  min,
  onValueChange,
  step,
  value,
  ...props
}: WorkbenchPropertyNumberRowProps) {
  const generatedId = useId();
  const inputId = htmlFor ?? generatedId;

  return (
    <WorkbenchPropertyRow htmlFor={inputId} {...props}>
      <NumberInput
        controlWidth={controlWidth}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        step={step}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyRangeRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | string | undefined;
  value?: number | undefined;
}

export function WorkbenchPropertyRangeRow({
  controlWidth = 'full',
  disabled,
  max,
  min,
  onValueChange,
  step,
  value,
  ...props
}: WorkbenchPropertyRangeRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <TextInput
        controlWidth={controlWidth}
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onValueChange={(next) => {
          const parsed = Number.parseFloat(next);
          if (!Number.isNaN(parsed)) {
            onValueChange(parsed);
          }
        }}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyColorRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  disabled?: boolean | undefined;
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchPropertyColorRow({
  disabled,
  fallbackValue,
  onValueChange,
  value,
  ...props
}: WorkbenchPropertyColorRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <WorkbenchColorInput
        disabled={disabled}
        fallbackValue={fallbackValue ?? '#000000'}
        value={value}
        onValueChange={onValueChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertySelectOption<TValue extends string = string> {
  disabled?: boolean | undefined;
  label: ReactNode;
  value: TValue;
}

export interface WorkbenchPropertySelectRowProps<TValue extends string = string> extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onValueChange: (value: TValue) => void;
  options: readonly WorkbenchPropertySelectOption<TValue>[];
  value?: TValue | undefined;
}

export function WorkbenchPropertySelectRow<TValue extends string = string>({
  controlWidth = 'full',
  disabled,
  htmlFor,
  onValueChange,
  options,
  value,
  ...props
}: WorkbenchPropertySelectRowProps<TValue>) {
  const generatedId = useId();
  const inputId = htmlFor ?? generatedId;

  return (
    <WorkbenchPropertyRow htmlFor={inputId} {...props}>
      <Select
        controlWidth={controlWidth}
        disabled={disabled}
        id={inputId}
        value={value ?? options[0]?.value ?? ''}
        onValueChange={(next) => onValueChange(next as TValue)}
      >
        {options.map((option) => (
          <option key={option.value} disabled={option.disabled} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertySelectActionRowProps<TValue extends string = string> extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  actionDisabled?: boolean | undefined;
  actionLabel: ReactNode;
  actionTitle?: string | undefined;
  controlWidth?: ControlWidth;
  disabled?: boolean | undefined;
  onAction: () => void;
  onValueChange: (value: TValue) => void;
  options: readonly WorkbenchPropertySelectOption<TValue>[];
  value?: TValue | undefined;
}

export function WorkbenchPropertySelectActionRow<TValue extends string = string>({
  actionDisabled,
  actionLabel,
  actionTitle,
  controlWidth = 'full',
  disabled,
  onAction,
  onValueChange,
  options,
  value,
  ...props
}: WorkbenchPropertySelectActionRowProps<TValue>) {
  return (
    <WorkbenchPropertyRow {...props}>
      <WorkbenchPropertyInline>
        <Select
          controlWidth={controlWidth}
          disabled={disabled}
          value={value ?? options[0]?.value ?? ''}
          onValueChange={(next) => onValueChange(next as TValue)}
        >
          {options.map((option) => (
            <option key={option.value} disabled={option.disabled} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <WorkbenchPropertyToggleButton
          disabled={actionDisabled}
          title={actionTitle}
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </WorkbenchPropertyToggleButton>
      </WorkbenchPropertyInline>
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyCheckboxRowProps extends Omit<
  WorkbenchPropertyRowProps,
  'children'
> {
  checked?: boolean | undefined;
  checkboxLabel?: ReactNode;
  disabled?: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
}

export function WorkbenchPropertyCheckboxRow({
  checked,
  checkboxLabel,
  disabled,
  onCheckedChange,
  ...props
}: WorkbenchPropertyCheckboxRowProps) {
  return (
    <WorkbenchPropertyRow {...props}>
      <Checkbox
        checked={Boolean(checked)}
        disabled={disabled}
        label={checkboxLabel}
        onCheckedChange={onCheckedChange}
      />
    </WorkbenchPropertyRow>
  );
}

export interface WorkbenchPropertyPanelProps extends ComponentPropsWithRef<'div'> {
  empty?: boolean;
}

export function WorkbenchPropertyPanel({
  className,
  empty = false,
  ...props
}: WorkbenchPropertyPanelProps) {
  return (
    <div
      className={cx(
        'ui-workbench-property-panel',
        empty && 'ui-workbench-property-panel--empty',
        className,
      )}
      {...props}
    />
  );
}

export type WorkbenchSectionTitleProps = ComponentPropsWithRef<'div'>;

export function WorkbenchSectionTitle({ className, ...props }: WorkbenchSectionTitleProps) {
  return <div className={cx('ui-workbench-section-title', className)} {...props} />;
}

export interface WorkbenchPropertySectionProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'title'
> {
  actions?: ReactNode;
  bodyClassName?: string;
  title?: ReactNode;
}

export function WorkbenchPropertySection({
  actions,
  bodyClassName,
  children,
  className,
  title,
  ...props
}: WorkbenchPropertySectionProps) {
  return (
    <section className={cx('ui-workbench-property-section', className)} {...props}>
      {title || actions ? (
        <div className="ui-workbench-property-section__header">
          {title ? <WorkbenchSectionTitle>{title}</WorkbenchSectionTitle> : null}
          {actions ? <div className="ui-workbench-property-section__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cx('ui-workbench-property-section__body', bodyClassName)}>{children}</div>
    </section>
  );
}

export interface WorkbenchPropertyStackProps extends ComponentPropsWithRef<'div'> {
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

export function WorkbenchPropertyStack({
  className,
  gap = 'md',
  ...props
}: WorkbenchPropertyStackProps) {
  return <div className={cx('ui-workbench-property-stack', className)} data-gap={gap} {...props} />;
}

export interface WorkbenchPropertyGridProps extends ComponentPropsWithRef<'div'> {
  columns?: 2 | 3;
  gap?: 'xs' | 'sm' | 'md';
}

export function WorkbenchPropertyGrid({
  className,
  columns = 2,
  gap = 'sm',
  ...props
}: WorkbenchPropertyGridProps) {
  return (
    <div
      className={cx('ui-workbench-property-grid', className)}
      data-columns={columns}
      data-gap={gap}
      {...props}
    />
  );
}

export interface WorkbenchPropertyInlineProps extends ComponentPropsWithRef<'div'> {
  justify?: 'start' | 'between';
}

export function WorkbenchPropertyInline({
  className,
  justify = 'start',
  ...props
}: WorkbenchPropertyInlineProps) {
  return (
    <div
      className={cx('ui-workbench-property-inline', className)}
      data-justify={justify}
      {...props}
    />
  );
}

export type WorkbenchPropertyHintProps = ComponentPropsWithRef<'span'>;

export function WorkbenchPropertyHint({ className, ...props }: WorkbenchPropertyHintProps) {
  return <span className={cx('ui-workbench-property-hint', className)} {...props} />;
}

export type WorkbenchPropertyCardProps = ComponentPropsWithRef<'div'>;

export function WorkbenchPropertyCard({ className, ...props }: WorkbenchPropertyCardProps) {
  return <div className={cx('ui-workbench-property-card', className)} {...props} />;
}

export interface WorkbenchPropertyKeyValueProps extends ComponentPropsWithRef<'div'> {
  name: ReactNode;
  value: ReactNode;
}

export function WorkbenchPropertyKeyValue({
  className,
  name,
  value,
  ...props
}: WorkbenchPropertyKeyValueProps) {
  return (
    <div className={cx('ui-workbench-property-key-value', className)} {...props}>
      <span className="ui-workbench-property-key-value__name">{name}</span>
      <span className="ui-workbench-property-key-value__value">{value}</span>
    </div>
  );
}

export interface WorkbenchPropertyToggleButtonProps extends ButtonProps {
  active?: boolean;
}

export function WorkbenchPropertyToggleButton({
  active = false,
  className,
  compact = true,
  ...props
}: WorkbenchPropertyToggleButtonProps) {
  return (
    <Button
      className={cx('ui-workbench-property-toggle', className)}
      compact={compact}
      data-active={active ? 'true' : 'false'}
      {...props}
    />
  );
}

export type WorkbenchColorRowProps = ComponentPropsWithRef<'div'>;

export function WorkbenchColorRow({ className, ...props }: WorkbenchColorRowProps) {
  return <div className={cx('ui-workbench-color-row', className)} {...props} />;
}

export interface WorkbenchColorInputProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'onChange'
> {
  disabled?: boolean | undefined;
  fallbackValue?: string;
  onValueChange: (value: string) => void;
  value?: string | undefined;
}

export function WorkbenchColorInput({
  disabled = false,
  fallbackValue = '#000000',
  onValueChange,
  value,
  ...props
}: WorkbenchColorInputProps) {
  const currentValue = value ?? fallbackValue;

  return (
    <WorkbenchColorRow {...props}>
      <TextInput
        className="ui-workbench-color-input"
        disabled={disabled}
        type="color"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <TextInput
        controlWidth="full"
        disabled={disabled}
        type="text"
        value={currentValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </WorkbenchColorRow>
  );
}

export type WorkbenchParseErrorProps = ComponentPropsWithRef<'div'>;

export function WorkbenchParseError({ className, ...props }: WorkbenchParseErrorProps) {
  return <div className={cx('ui-workbench-parse-error', className)} {...props} />;
}
