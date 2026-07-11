import { createHash } from 'node:crypto'
import { AccessToken, WebhookReceiver } from 'livekit-server-sdk'
import { describe, expect, it } from 'vite-plus/test'

describe('LiveKit webhook signatures', () => {
  it('accepts the signed raw body and rejects a modified body', async () => {
    const apiKey = 'test-key'
    const apiSecret = 'test-secret-with-enough-entropy'
    const body = JSON.stringify({
      event: 'room_finished',
      room: { sid: 'RM_1', name: 'canvas:canvas-1' },
      createdAt: '1783731600'
    })
    const token = Reflect.construct(AccessToken, [
      apiKey,
      apiSecret
    ]) as AccessToken
    token.sha256 = createHash('sha256').update(body).digest('base64')
    const authorization = await token.toJwt()
    const receiver = new WebhookReceiver(apiKey, apiSecret)

    await expect(receiver.receive(body, authorization)).resolves.toMatchObject({
      event: 'room_finished',
      room: { sid: 'RM_1', name: 'canvas:canvas-1' }
    })
    await expect(receiver.receive(`${body} `, authorization)).rejects.toThrow(
      'sha256'
    )
  })
})
