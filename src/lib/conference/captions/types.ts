import type {
  CAPTION_LANGUAGE_CODES,
  CAPTION_TEXT_COLOR_CODES,
  CAPTION_TEXT_SIZE_CODES
} from '../captions'

export type CaptionLanguageCode = (typeof CAPTION_LANGUAGE_CODES)[number]

export type CaptionTextSize = (typeof CAPTION_TEXT_SIZE_CODES)[number]

export type CaptionTextColor = (typeof CAPTION_TEXT_COLOR_CODES)[number]

export type CaptionPrefs = {
  language?: CaptionLanguageCode
}
