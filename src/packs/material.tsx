import { lazy, type ComponentType, type LazyExoticComponent } from "react"

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number | string; "aria-hidden"?: boolean }>

export const glyphs: Record<string, LazyExoticComponent<Icon>> = {
  "home": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/home.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "search": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/search.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "user": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/person.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "settings": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/settings.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "heart": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/favorite.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "star": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/star.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "plus": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/add.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "close": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/close.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "check": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/check.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "arrow-left": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/arrow_back.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "arrow-right": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/arrow_forward.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "menu": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/menu.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "bell": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/notifications.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "mail": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/mail.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "calendar": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/calendar_today.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "camera": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/photo_camera.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "trash": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/delete.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "edit": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/edit.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "share": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/share.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "download": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/download.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "upload": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/upload.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "lock": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/lock.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "play": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/play_arrow.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "pause": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/pause.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "wallet": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/account_balance_wallet.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "credit-card": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/credit_card.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "banknote": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/payments.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "landmark": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/account_balance.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "piggy-bank": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/savings.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "receipt": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/receipt_long.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "chart-line": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/show_chart.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "trending-up": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/trending_up.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "calculator": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/calculate.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "coins": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/paid.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "shield": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/shield.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "send": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/send.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "arrow-left-right": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/swap_horiz.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "file-text": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/description.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "dumbbell": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/fitness_center.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "activity": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/monitor_heart.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "heart-pulse": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/ecg_heart.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "timer": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/timer.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "flame": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/local_fire_department.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "bike": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/directions_bike.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "footprints": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/steps.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "target": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/my_location.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "droplets": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/water_drop.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "stretch-horizontal": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/unfold_more.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "shopping-bag": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/shopping_bag.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "shopping-cart": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/shopping_cart.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "tag": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/sell.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "store": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/store.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "package": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/package_2.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "truck": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/local_shipping.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "gift": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/redeem.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "percent": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/percent.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "barcode": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/barcode.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "box": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/inventory_2.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "undo-2": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/undo.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "message-circle": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/chat.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "user-plus": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/person_add.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "users": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/group.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "share-2": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/share.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "image": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/image.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "at-sign": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/alternate_email.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "hash": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/tag.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "bookmark": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/bookmark.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "smile": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/sentiment_satisfied.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "repeat": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/repeat.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "clock": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/schedule.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "list": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/list.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "kanban": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/view_kanban.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "folder": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/folder.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "file": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/draft.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "inbox": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/inbox.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "alarm-clock": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/alarm.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "sticky-note": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/sticky_note_2.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "pencil": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/edit.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "flag": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/flag.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "plane": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/flight.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "map": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/map.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "map-pin": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/location_on.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "luggage": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/luggage.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "compass": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/explore.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "train-front": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/train.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "car": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/directions_car.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "hotel": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/hotel.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "ticket": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/confirmation_number.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "sun": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/wb_sunny.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "cloud": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/cloud.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "navigation": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/navigation.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "globe": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/public.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "bed": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/bed.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "utensils": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/restaurant.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "coffee": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/coffee.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "pizza": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/local_pizza.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "wine": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/wine_bar.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "ice-cream-cone": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/icecream.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "chef-hat": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/cooking.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "salad": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/restaurant.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "shopping-basket": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/shopping_basket.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "pill": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/medication.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "stethoscope": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/medical_services.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "thermometer": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/device_thermostat.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "bandage": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/healing.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "syringe": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/vaccines.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "brain": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/psychology.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
  "eye": lazy(async () => {
    const mod = await import("@material-symbols/svg-400/outlined/visibility.svg?raw")
    const svg = String(mod.default).replace("<svg ", '<svg width="100%" height="100%" ')
    function Glyph() {
      return <span className="material-glyph" dangerouslySetInnerHTML={{ __html: svg }} />
    }
    return { default: Glyph }
  }),
}
