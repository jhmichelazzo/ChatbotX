import { DEFAULT_API_VERSION } from "../constants"
import { rescue } from "../exception"
import { instagramBusinessClient } from "../lib/http-client"
import type { InstagramAuthValue } from "../schemas"

export const sendComment = (
  auth: InstagramAuthValue,
  commentId: string,
  message: string | null,
): Promise<{ id: string }> => {
  const version = auth.metadata.version ?? DEFAULT_API_VERSION
  const endpoint = `${version}/${commentId}/replies`

  return rescue(endpoint, () =>
    instagramBusinessClient.post<{ id: string }>(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      },
      json: { message },
      retry: 0,
    }),
  )
}

export const deleteComment = (
  auth: InstagramAuthValue,
  commentId: string,
): Promise<{ success: boolean }> => {
  const version = auth.metadata.version ?? DEFAULT_API_VERSION
  const endpoint = `${version}/${commentId}`

  return rescue(endpoint, () =>
    instagramBusinessClient.delete<{ success: boolean }>(endpoint, {
      headers: {
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      },
    }),
  )
}

export const hideComment = (
  auth: InstagramAuthValue,
  commentId: string,
  hidden: boolean,
): Promise<{ success: boolean }> => {
  const version = auth.metadata.version ?? DEFAULT_API_VERSION
  const endpoint = `${version}/${commentId}`

  return rescue(endpoint, () =>
    instagramBusinessClient.post<{ success: boolean }>(endpoint, {
      headers: {
        Authorization: `Bearer ${auth.tokens.accessToken}`,
      },
      searchParams: { hide: String(hidden) },
    }),
  )
}

/**
 * Instagram accepts `recipient: { comment_id }` on the messages endpoint, which
 * opens a conversation with someone who commented but never sent a DM before.
 *
 * The comment automation previously skipped Instagram entirely, on the
 * assumption that no private reply API existed for it. It does — verified
 * against `graph.instagram.com/<version>/me/messages`, HTTP 200.
 */
export const sendPrivateReply = (
  auth: InstagramAuthValue,
  commentId: string,
  message: string,
): Promise<{ recipient_id: string; message_id: string }> => {
  const version = auth.metadata.version ?? DEFAULT_API_VERSION
  const endpoint = `${version}/me/messages`

  return rescue(endpoint, () =>
    instagramBusinessClient.post<{ recipient_id: string; message_id: string }>(
      endpoint,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.tokens.accessToken}`,
        },
        json: {
          recipient: { comment_id: commentId },
          message: { text: message },
        },
        retry: 0,
      },
    ),
  )
}
