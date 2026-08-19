import type { ComponentProps } from 'svelte'
import Button from './actions/Button.svelte'
import IconButton from './actions/IconButton.svelte'
import Badge from './feedback/Badge.svelte'
import Input from './forms/Input.svelte'
import Select from './forms/Select.svelte'
import Switch from './forms/Switch.svelte'
import Textarea from './forms/Textarea.svelte'
import Dialog from './overlays/Dialog.svelte'
import Popover from './overlays/Popover.svelte'

export {
  Badge,
  Button,
  Dialog,
  IconButton,
  Input,
  Popover,
  Select,
  Switch,
  Textarea
}

export type ButtonProps = ComponentProps<typeof Button>
export type ButtonSize = NonNullable<ButtonProps['size']>
export type ButtonVariant = NonNullable<ButtonProps['variant']>
export type IconButtonProps = ComponentProps<typeof IconButton>
export type BadgeProps = ComponentProps<typeof Badge>
export type BadgeVariant = NonNullable<BadgeProps['variant']>
export type InputProps = ComponentProps<typeof Input>
export type SelectProps = ComponentProps<typeof Select>
export type SelectOption = SelectProps['options'][number]
export type SwitchProps = ComponentProps<typeof Switch>
export type TextareaProps = ComponentProps<typeof Textarea>
export type DialogProps = ComponentProps<typeof Dialog>
export type PopoverProps = ComponentProps<typeof Popover>
