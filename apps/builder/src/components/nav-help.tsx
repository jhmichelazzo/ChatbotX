"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@chatbotx.io/ui/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@chatbotx.io/ui/components/ui/sidebar"
import { CircleHelpIcon } from "lucide-react"
import { DynamicIcon, type IconName } from "lucide-react/dynamic"
import { useTranslations } from "next-intl"
import { useTenantSettings } from "@/features/tenant/tenant-settings-provider"

const ALLOWED_URL_RE = /^(https?:\/\/|mailto:)/i

/**
 * Help entries that always show, on top of whatever the tenant configures.
 *
 * Tenant-configured `helpItems` are an enterprise feature, so a community
 * deployment has no way to point operators at its own documentation. These are
 * merged in rather than replacing the tenant list, so nothing is hidden when
 * both exist.
 */
const OWN_HELP_ITEMS = [
  {
    id: "abdal-como-usar",
    name: "Como usar",
    url: "https://comousar.abdaldigital.com.br",
    icon: "book-open",
  },
]

export const NavHelp = () => {
  const { isMobile } = useSidebar()
  const t = useTranslations()
  const { helpItems: tenantHelpItems } = useTenantSettings()

  const helpItems = [...OWN_HELP_ITEMS, ...tenantHelpItems]

  if (helpItems.length === 0) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              aria-label={t("helpMenu.ariaLabel")}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <CircleHelpIcon className="size-4" />
              <span>{t("helpMenu.title")}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-48"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {helpItems
              .filter((item) => ALLOWED_URL_RE.test(item.url))
              .map((item) => {
                const isMailto = item.url.startsWith("mailto:")
                return (
                  <DropdownMenuItem asChild key={item.id}>
                    <a
                      href={item.url}
                      {...(!isMailto && {
                        rel: "noopener noreferrer",
                        target: "_blank",
                      })}
                    >
                      <DynamicIcon
                        className="mr-2 size-4"
                        name={(item.icon ?? "circle-help") as IconName}
                      />
                      {item.name}
                    </a>
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
