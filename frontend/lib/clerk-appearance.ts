/**
 * Clerk, dressed as Scout.
 *
 * Clerk's defaults are cool grey/blue, which fought the warm paper-and-ink
 * palette badly on the sign-in screens and in the account popover. Two rules
 * make this work:
 *
 *  1. Colours come from element class names, not `variables`. `variables` takes
 *     literal colours that Clerk parses to derive shades, so a `var(--token)`
 *     would not resolve there — and one hex cannot serve light and dark.
 *  2. Utilities are marked important (`bg-card!`). Clerk's own emotion styles
 *     are injected after the Tailwind sheet, so an unmarked `bg-card` loses the
 *     cascade to Clerk's white default even though the class is present.
 *
 * Deliberately unannotated: `@clerk/types` is not a direct dependency, and an
 * inferred object stays assignable to the `appearance` prop without pinning us
 * to Clerk's internal element union.
 */
export const scoutClerkAppearance = {
  layout: {
    socialButtonsVariant: "blockButton",
    logoPlacement: "none",
    shimmer: true,
  },
  variables: {
    colorPrimary: "#b0500a",
    colorDanger: "#ad2318",
    colorSuccess: "#15703c",
    colorWarning: "#a8620a",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    fontSize: "0.9rem",
  },
  elements: {
    rootBox: "w-full!",
    cardBox: "w-full! border-0! bg-transparent! shadow-none!",
    card: "w-full! border-0! bg-transparent! shadow-none! p-0! gap-5!",
    header: "gap-1!",
    headerTitle:
      "font-serif! text-2xl! font-semibold! tracking-tight! text-foreground!",
    headerSubtitle: "text-sm! text-muted-foreground!",

    socialButtons: "gap-2!",
    socialButtonsBlockButton:
      "border! border-border! bg-transparent! text-foreground! rounded-md! h-9! hover:bg-muted! shadow-none!",
    socialButtonsBlockButtonText: "text-sm! font-medium! text-foreground!",
    socialButtonsProviderIcon: "size-4!",

    dividerLine: "bg-border!",
    dividerText:
      "font-mono! text-[10px]! tracking-[0.14em]! uppercase! text-muted-foreground!",

    formFieldLabel:
      "text-[12px]! font-normal! normal-case! tracking-normal! text-muted-foreground!",
    formFieldInput:
      "h-9! rounded-md! border! border-input! bg-card! text-foreground! placeholder:text-subtle-foreground! focus:border-border-strong! shadow-none!",
    formFieldInputShowPasswordButton:
      "text-muted-foreground! hover:text-foreground!",
    formFieldAction: "text-brand! hover:text-brand-hover!",
    formFieldHintText: "text-xs! text-muted-foreground!",
    formFieldErrorText: "text-xs! text-destructive!",
    formFieldSuccessText: "text-xs! text-success!",

    formButtonPrimary:
      "h-9! rounded-md! bg-foreground! text-background! text-[13px]! font-medium! normal-case! tracking-normal! shadow-none! hover:bg-foreground/88! after:hidden!",
    formButtonReset: "text-muted-foreground! hover:text-foreground!",

    identityPreview: "rounded-lg! border! border-border! bg-muted!",
    identityPreviewText: "text-sm! text-foreground!",
    identityPreviewEditButton: "text-brand! hover:text-brand-hover!",

    otpCodeFieldInput:
      "rounded-lg! border! border-input! bg-background! text-foreground!",
    formResendCodeLink: "text-brand! hover:text-brand-hover!",

    footer: "bg-transparent! border-0! mt-1!",
    footerAction: "bg-transparent!",
    footerActionText: "text-sm! text-muted-foreground!",
    footerActionLink: "text-sm! font-medium! text-brand! hover:text-brand-hover!",

    badge: "rounded-full! border! border-border! bg-muted! text-muted-foreground!",
    alert: "rounded-lg! border! border-destructive/30! bg-destructive-muted!",
    alertText: "text-sm! text-destructive!",

    // Account popover, reachable from every application bar.
    // Account control. Clerk renders `showName` as name-then-avatar and colours
    // the identifier from its own palette, which came out near-invisible on the
    // dark sidebar ground — so both the order and the colour are set here.
    userButtonBox: "flex-row! gap-2! text-foreground!",
    userButtonTrigger:
      "rounded-md! px-1! py-1! shadow-none! hover:bg-muted! focus:shadow-none!",
    userButtonOuterIdentifier:
      "order-none! pl-0! text-[13px]! font-medium! text-foreground!",
    userButtonAvatarBox: "rounded-full!",
    userButtonPopoverCard:
      "rounded-xl! border! border-border! bg-popover! text-popover-foreground! shadow-lg!",
    userButtonPopoverMain: "bg-popover!",
    userButtonPopoverActions: "bg-popover!",
    userButtonPopoverActionButton:
      "text-sm! text-foreground! hover:bg-accent! rounded-md!",
    userButtonPopoverActionButtonText: "text-foreground!",
    userButtonPopoverActionButtonIcon: "text-muted-foreground!",
    userButtonPopoverFooter: "hidden!",
    userPreviewMainIdentifier: "text-sm! font-medium! text-foreground!",
    userPreviewSecondaryIdentifier: "text-xs! text-muted-foreground!",
  },
};

/**
 * Overrides for the split-screen auth pages, where the surrounding layout
 * already supplies the heading and the card chrome — without these the form
 * sits in a box inside a box.
 */
export const embeddedAuthAppearance = {
  elements: {
    cardBox: "border-0! bg-transparent! shadow-none!",
    card: "border-0! bg-transparent! shadow-none! p-0! gap-5!",
    header: "hidden!",
  },
};
