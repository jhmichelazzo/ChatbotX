import type { Context, IncomingContact } from "@chatbotx.io/sdk"
import { createId } from "@chatbotx.io/utils"
import { rescue } from "../exception"
import { instagramBusinessClient } from "../lib/http-client"
import { logger } from "../lib/logger"
import type { InstagramAuthValue, InstagramUserProfile } from "../schemas"

export const getUserProfile = ({
  ctx,
  psid,
}: {
  ctx: Context<InstagramAuthValue>
  psid: string
}): Promise<IncomingContact> => {
  const endpoint = `${ctx.auth.metadata.version}/${psid}`

  const fetchFields = (fields: string) => {
    const queries = new URLSearchParams({
      fields,
      access_token: ctx.auth.tokens.accessToken,
    })
    return instagramBusinessClient.get<InstagramUserProfile>(
      `${ctx.auth.metadata.version}/${psid}?${queries.toString()}`,
    )
  }

  return rescue(endpoint, async () => {
    // Requesting every field at once means one unavailable field fails the whole
    // call, and the contact is then created with no name, no username and no
    // avatar. `instagram-facebook` already retries without `profile_pic` for
    // this reason; mirror that here, with a last step that asks for the username
    // alone so a contact is never left completely blank.
    let response: InstagramUserProfile
    try {
      response = await fetchFields("id,name,username,profile_pic")
    } catch (error) {
      logger.warn({ psid, error }, "getUserProfile: retrying without profile_pic")
      try {
        response = await fetchFields("id,name,username")
      } catch (retryError) {
        logger.warn({ psid, error: retryError }, "getUserProfile: retrying with username only")
        response = await fetchFields("id,username")
      }
    }

    const result: IncomingContact = {
      // `username` is already requested above and was being discarded. Accounts
      // with no display name set would end up nameless in the inbox.
      firstName: response.name || response.username,
      sourceId: psid,
    }

    if (response.profile_pic) {
      try {
        result.avatar = await getUserProfilePicture({
          ctx,
          pictureUrl: response.profile_pic,
        })
      } catch (error) {
        logger.error(error, "getUserProfilePicture error")
      }
    }

    return result
  })
}

export const getUserProfilePicture = async ({
  ctx,
  pictureUrl,
}: {
  ctx: Context<InstagramAuthValue>
  pictureUrl: string
}): Promise<string | undefined> => {
  const response = await fetch(pictureUrl, {
    headers: {
      Authorization: `Bearer ${ctx.auth.tokens.accessToken}`,
      "User-Agent": "node",
    },
  })
  if (response.ok && response.body) {
    const originPath = `${ctx.storagePrefix}/avatars/${createId()}`
    const bytes = await response.arrayBuffer()
    const mimeType = response.headers.get("content-type") ?? "image/png"

    await ctx.uploader?.putObject(originPath, Buffer.from(bytes), {
      ACL: "public-read",
      ContentType: mimeType,
    })

    return originPath
  }
}
