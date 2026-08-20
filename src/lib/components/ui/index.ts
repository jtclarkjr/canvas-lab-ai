import type { ComponentProps } from 'svelte'
import Button from './actions/Button.svelte'
import IconButton from './actions/IconButton.svelte'
import Badge from './feedback/Badge.svelte'
import Skeleton from './feedback/Skeleton.svelte'
import Card from './layout/Card.svelte'
import SegmentedControl from './navigation/SegmentedControl.svelte'
import Input from './forms/Input.svelte'
import Select from './forms/Select.svelte'
import Switch from './forms/Switch.svelte'
import Textarea from './forms/Textarea.svelte'
import Dialog from './overlays/Dialog.svelte'
import Drawer from './overlays/Drawer.svelte'
import BottomSheet from './overlays/BottomSheet.svelte'
import Popover from './overlays/Popover.svelte'

export {
  Badge,
  BottomSheet,
  Button,
  Card,
  Dialog,
  Drawer,
  IconButton,
  Input,
  Popover,
  Select,
  SegmentedControl,
  Skeleton,
  Switch,
  Textarea
}

export type ButtonProps = ComponentProps<typeof Button>
export type BottomSheetProps = ComponentProps<typeof BottomSheet>
export type ButtonSize = NonNullable<ButtonProps['size']>
export type ButtonVariant = NonNullable<ButtonProps['variant']>
export type IconButtonProps = ComponentProps<typeof IconButton>
export type BadgeProps = ComponentProps<typeof Badge>
export type BadgeVariant = NonNullable<BadgeProps['variant']>
export type SkeletonProps = ComponentProps<typeof Skeleton>
export type SkeletonShape = NonNullable<SkeletonProps['shape']>
export type CardProps = ComponentProps<typeof Card>
export type CardPadding = NonNullable<CardProps['padding']>
export type CardVariant = NonNullable<CardProps['variant']>
export type InputProps = ComponentProps<typeof Input>
export type SelectProps = ComponentProps<typeof Select>
export type SelectOption = SelectProps['options'][number]
export type SwitchProps = ComponentProps<typeof Switch>
export type TextareaProps = ComponentProps<typeof Textarea>
export type DialogProps = ComponentProps<typeof Dialog>
export type DrawerProps = ComponentProps<typeof Drawer>
export type PopoverProps = ComponentProps<typeof Popover>
export type SegmentedControlProps = ComponentProps<typeof SegmentedControl>
export type SegmentedControlItem = SegmentedControlProps['items'][number]
