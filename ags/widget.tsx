import Astal from "gi://Astal?version=4.0"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalNetwork from "gi://AstalNetwork"
import AstalBluetooth from "gi://AstalBluetooth"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import AstalWp from "gi://AstalWp"
import { createBinding, createState, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import Pango from "gi://Pango"

const batteryLimit = "/sys/class/power_supply/BAT0/charge_control_end_threshold"
const batteryStateFile = `${GLib.get_user_config_dir()}/ags/battery-limit`
const batteryHelper = "/usr/local/libexec/confighypr-battery-limit"
const airplayIcon = `${GLib.get_user_config_dir()}/ags/airplay-symbolic.svg`
const hasNightLight = GLib.find_program_in_path("hyprsunset") !== null
const run = (command: string[]) => execAsync(command).catch((error) => print(error))
const setPointer = (self: Gtk.Widget) => self.set_cursor_from_name("pointer")

function readBatteryPreference(): "80" | "100" | null {
  try {
    const [ok, contents] = GLib.file_get_contents(batteryStateFile)
    if (!ok) return null
    const value = new TextDecoder().decode(contents).trim()
    return value === "80" || value === "100" ? value : null
  } catch {
    return null
  }
}

function SliderRow({ title, value, onChange }: any) {
  const lowIcon = title === "Volumen" ? "audio-volume-low-symbolic" : "display-brightness-symbolic"
  const highIcon = title === "Volumen" ? "audio-volume-high-symbolic" : "display-brightness-symbolic"
  return <box cssClasses={["slider-card"]} orientation={Gtk.Orientation.VERTICAL} spacing={0}>
    <label label={title} cssClasses={["slider-label"]} halign={Gtk.Align.START} />
    <box cssClasses={["slider-control"]} spacing={8}>
      <image iconName={lowIcon} cssClasses={["slider-icon"]} />
      <slider $={setPointer} hexpand min={0} max={1} step={title === "Brillo" ? 0.05 : 0.01} value={value} onChangeValue={({ value: next }: { value: number }) => onChange(next)} />
      <image iconName={highIcon} cssClasses={["slider-icon"]} />
    </box>
  </box>
}

function Header() {
  const uptime = createPoll("", 60_000, () =>
    execAsync(["bash", "-lc", "awk '{printf \"%dh %02dm\", $1/3600, ($1%3600)/60}' /proc/uptime"])
      .catch(() => "")
  )

  return <box cssClasses={["header"]} spacing={6}>
    <box orientation={Gtk.Orientation.VERTICAL} hexpand>
      <label label="Bruno" cssClasses={["eyebrow"]} halign={Gtk.Align.START} />
      <label label={uptime} cssClasses={["header-subtitle"]} halign={Gtk.Align.START} />
    </box>
    <button cssClasses={["icon-button", "lock-button"]} valign={Gtk.Align.START} tooltipText="Bloquear" onClicked={() => run(["hyprlock"])} $={setPointer}>
      <image iconName="system-lock-screen-symbolic" />
    </button>
    <button cssClasses={["icon-button", "suspend-button"]} valign={Gtk.Align.START} tooltipText="Suspender" onClicked={() => run(["systemctl", "suspend"])} $={setPointer}>
      <image iconName="weather-clear-night-symbolic" />
    </button>
    <button cssClasses={["icon-button", "restart-button"]} valign={Gtk.Align.START} tooltipText="Reiniciar" onClicked={() => run(["systemctl", "reboot"])} $={setPointer}>
      <image iconName="view-refresh-symbolic" />
    </button>
    <button cssClasses={["icon-button", "danger"]} valign={Gtk.Align.START} tooltipText="Apagar" onClicked={() => run(["systemctl", "poweroff"])} $={setPointer}>
      <image iconName="system-shutdown-symbolic" />
    </button>
  </box>
}

function Tile({ icon, iconFile, title, subtitle, active, onToggle, onOpen, actionHint }: any) {
  const openMenu = () => {
    try {
      const result = onOpen?.()
      if (result && typeof result.catch === "function") result.catch((error: unknown) => print(error))
    } catch (error) { print(error) }
  }
  return <box cssClasses={active ? active.as((value: boolean) => value ? ["tile", "tile-active"] : ["tile"]) : ["tile"]} $={setPointer}>
    <button cssClasses={["tile-icon"]} valign={Gtk.Align.CENTER} onClicked={onToggle} tooltipText={actionHint || `${title}: activar/desactivar`} $={setPointer}>
      {iconFile ? <image $={(self) => (self as Gtk.Image).set_from_file(iconFile)} /> : <image iconName={icon} />}
    </button>
    <button cssClasses={["tile-copy"]} valign={Gtk.Align.CENTER} hexpand onClicked={onToggle} tooltipText={actionHint} $={setPointer}>
      <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
        <label label={title} cssClasses={["tile-title"]} halign={Gtk.Align.START} />
        <label label={subtitle} cssClasses={["tile-subtitle"]} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
      </box>
    </button>
    {onOpen && <button cssClasses={["tile-chevron"]} valign={Gtk.Align.CENTER} onClicked={openMenu} $={setPointer}><image iconName="go-next-symbolic" /></button>}
    <Gtk.GestureClick button={1} propagationPhase={Gtk.PropagationPhase.CAPTURE} onPressed={(gesture, _presses, x, y) => {
      const tile = gesture.get_widget()
      if (tile && tile.pick(x, y, Gtk.PickFlags.DEFAULT) === tile) onToggle()
    }} />
    {onOpen && <Gtk.GestureClick button={3} propagationPhase={Gtk.PropagationPhase.CAPTURE} onPressed={openMenu} />}
  </box>
}

function Connectivity() {
  const network = AstalNetwork.get_default()
  const bluetooth = AstalBluetooth.get_default()
  const speaker = AstalWp.get_default().defaultSpeaker
  const wifi = network.wifi
  const [openMenu, setOpenMenu] = createState<"wifi" | "bluetooth" | null>(null)
  const brightness = createPoll(0.5, 5_000, () => execAsync(["bash", "-lc", "brightnessctl -m | awk -F, '{gsub(/%/, \"\", $4); print $4/100}'"])
    .then((value) => Math.max(0, Math.min(1, Number(value.trim()) || 0)))
    .catch(() => 0.5))
  const accessPoints = createPoll([], 2_000, () => {
    if (!wifi?.enabled) return []
    return execAsync(["nmcli", "-t", "--escape", "yes", "-f", "SSID,SIGNAL,IN-USE", "device", "wifi", "list"])
      .then((text) => text.split("\n").filter(Boolean).map((line) => {
        const [ssid, signal, inUse] = line.split(":")
        return { ssid: ssid?.replaceAll("\\:", ":"), signal: Number(signal), inUse: inUse === "*" }
      }).filter((item) => item.ssid).sort((a, b) => Number(b.inUse) - Number(a.inUse) || b.signal - a.signal).slice(0, 6))
      .catch(() => [])
  })
  const bluetoothDevices = createPoll([], 2_000, () => bluetooth.devices.map((device) => ({
    name: device.alias || device.name || device.address,
    address: device.address,
    connected: device.connected,
    paired: device.paired,
  })))
  const showWifi = async () => {
    try {
      if (!wifi?.enabled) await execAsync(["nmcli", "radio", "wifi", "on"])
      setOpenMenu(openMenu.peek() === "wifi" ? null : "wifi")
    } catch (error) { print(`No se pudo abrir el menú Wi-Fi: ${error}`) }
  }
  const showBluetooth = async () => {
    if (!bluetooth.isPowered) {
      try { await execAsync(["timeout", "3s", "bluetoothctl", "power", "on"]) } catch (error) { print(`No se pudo encender Bluetooth: ${error}`) }
    }
    try { bluetooth.adapter?.start_discovery() } catch (error) { print(error) }
    setOpenMenu(openMenu.peek() === "bluetooth" ? null : "bluetooth")
  }

  return <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
    <box orientation={Gtk.Orientation.VERTICAL} spacing={0}>
      <box spacing={10} homogeneous>
        {wifi && <Tile title="Wi-Fi" icon={createBinding(wifi, "iconName").as((icon) => String(icon || "network-wireless-offline-symbolic"))}
          subtitle={createBinding(wifi, "ssid").as((ssid) => String(ssid || (wifi.enabled ? "Desconectado" : "Apagado")))}
          active={createBinding(wifi, "enabled")}
          onToggle={() => { setOpenMenu(null); run(["nmcli", "radio", "wifi", wifi.enabled ? "off" : "on"]) }} onOpen={showWifi} />}
        <Tile title="Bluetooth" icon="bluetooth-active-symbolic"
          subtitle={createBinding(bluetooth, "isPowered").as((powered) => powered ? "Encendido" : "Apagado")}
          active={createBinding(bluetooth, "isPowered")}
          onToggle={() => { setOpenMenu(null); run(["timeout", "3s", "bluetoothctl", "power", bluetooth.isPowered ? "off" : "on"]) }} onOpen={showBluetooth} />
      </box>
    <revealer hexpand revealChild={openMenu.as((value) => value === "wifi")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN} transitionDuration={160}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={6} cssClasses={["network-list"]} hexpand>
        <box spacing={6}>
          <label label="Redes disponibles" cssClasses={["section-label"]} hexpand halign={Gtk.Align.START} />
          <button cssClasses={["network-close"]} $={setPointer} onClicked={() => setOpenMenu(null)}><image iconName="window-close-symbolic" /></button>
        </box>
        <For each={accessPoints}>{(point: any) => <button cssClasses={["network-row"]} $={setPointer} onClicked={() => {
          setOpenMenu(null)
          run(["nmcli", "device", "wifi", "connect", point.ssid])
        }}><box spacing={10}><image iconName={point.inUse ? "network-wireless-signal-excellent-symbolic" : "network-wireless-signal-good-symbolic"} />
          <label label={point.ssid} hexpand halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
          {point.inUse && <image iconName="object-select-symbolic" />}
        </box></button>}</For>
        <button cssClasses={["network-row"]} $={setPointer} onClicked={() => run(["nmcli", "device", "wifi", "rescan"])}>
          <label label="Buscar redes" halign={Gtk.Align.START} />
        </button>
      </box>
    </revealer>
    <revealer hexpand revealChild={openMenu.as((value) => value === "bluetooth")} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN} transitionDuration={160}>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={6} cssClasses={["network-list"]} hexpand>
        <box spacing={6}>
          <label label="Dispositivos disponibles" cssClasses={["section-label"]} hexpand halign={Gtk.Align.START} />
          <button cssClasses={["network-close"]} $={setPointer} onClicked={() => setOpenMenu(null)}><image iconName="window-close-symbolic" /></button>
        </box>
        <For each={bluetoothDevices}>{(device: any) => <button cssClasses={["network-row"]} $={setPointer} onClicked={async () => {
          setOpenMenu(null)
          if (device.connected) await execAsync(["timeout", "5s", "bluetoothctl", "disconnect", device.address]).catch((error) => print(error))
          else {
            if (!device.paired) await execAsync(["timeout", "10s", "bluetoothctl", "pair", device.address]).catch((error) => print(error))
            await execAsync(["timeout", "10s", "bluetoothctl", "connect", device.address]).catch((error) => print(error))
          }
        }}><box spacing={10}><image iconName={device.connected ? "bluetooth-active-symbolic" : "bluetooth-symbolic"} />
          <label label={device.name} hexpand halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
          {device.connected && <image iconName="object-select-symbolic" />}
        </box></button>}</For>
        <button cssClasses={["network-row"]} $={setPointer} onClicked={() => {
          try { bluetooth.adapter?.start_discovery() } catch (error) { print(error) }
        }}><label label="Buscar dispositivos" halign={Gtk.Align.START} /></button>
      </box>
    </revealer>
    </box>
    <SliderRow title="Volumen"
      value={createBinding(speaker, "volume")} onChange={(value: number) => speaker.set_volume(value)} />
    <SliderRow title="Brillo"
      value={brightness} onChange={(value: number) => run(["brightnessctl", "set", `${Math.round(value * 100)}%`])} />
  </box>
}

function Controls() {
  const power = AstalPowerProfiles.get_default()
  const battery = createPoll("", 2_000, () => execAsync(["cat", batteryLimit]).catch(() => ""))
  let batteryPreference = readBatteryPreference()
  const batteryReady = (async () => {
    const desired = batteryPreference || "100"
    try {
      const current = (await execAsync(["cat", batteryLimit])).trim()
      if (current !== desired) await execAsync(["pkexec", batteryHelper, "set", desired])
      GLib.file_set_contents(batteryStateFile, `${desired}\n`)
      batteryPreference = desired
    } catch (error) {
      print(error)
    }
  })()
  const airplay = createPoll(false, 1_000, () => execAsync(["pgrep", "-x", "uxplay"])
    .then(() => true).catch(() => false))
  const night = createPoll(false, 2_000, () => execAsync(["hyprctl", "hyprsunset", "identity", "get"])
    .then((identity) => identity.trim() === "false").catch(() => false))
  const toggleBatteryLimit = async () => {
    await batteryReady
    const next = batteryPreference === "80" ? "100" : "80"
    try {
      await execAsync(["pkexec", batteryHelper, "set", next])
      GLib.file_set_contents(batteryStateFile, `${next}\n`)
      batteryPreference = next
    } catch (error) {
      print(error)
    }
  }
  const toggleNight = () => {
    if (night.get()) run(["hyprctl", "hyprsunset", "identity"])
    else run(["hyprctl", "hyprsunset", "temperature", "4500"])
  }
  const toggleAirplay = () => {
    if (airplay.get()) run(["pkill", "-x", "uxplay"])
    else {
      try {
        Gio.Subprocess.new(["uxplay"], Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE)
      } catch (error) { print(error) }
    }
  }

  return <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
    <Connectivity />
    <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
      <box spacing={10} homogeneous>
        <Tile title="Luz nocturna" icon="weather-clear-night-symbolic"
          subtitle={hasNightLight ? night.as((enabled) => enabled ? "Cálida · 4500 K" : "Desactivada") : "Requiere hyprsunset"}
          active={night} onToggle={() => hasNightLight && toggleNight()} />
        <Tile title="Ahorro" icon="power-profile-power-saver-symbolic"
          subtitle={createBinding(power, "activeProfile").as((profile) => ({ "power-saver": "Activo", balanced: "Equilibrado", performance: "Rendimiento" }[String(profile)] || String(profile)))}
          active={createBinding(power, "activeProfile").as((profile) => profile === "power-saver")}
          onToggle={() => power.set_active_profile(power.activeProfile === "power-saver" ? "balanced" : "power-saver")} />
      </box>
      <box spacing={10} homogeneous>
        <Tile title="Límite de carga" icon="battery-good-symbolic"
          subtitle={battery.as((value) => value.trim() === "80" ? "80% activo" : value.trim() === "100" ? "Normal · 100%" : `${value.trim() || "—"}% → 100%`)}
          active={battery.as((value) => value.trim() === "80")}
          onToggle={toggleBatteryLimit}
          actionHint={battery.as((value) => value.trim() === "80" ? "Desactivar límite · 100%" : "Limitar carga al 80%")} />
        <Tile title="AirPlay" iconFile={airplayIcon}
          subtitle={airplay.as((enabled) => enabled ? "Receptor activo" : "Iniciar receptor")}
          active={airplay} onToggle={toggleAirplay}
          actionHint={airplay.as((enabled) => enabled ? "Apagar el receptor AirPlay" : "Iniciar el receptor AirPlay con uxplay")} />
      </box>
    </box>
  </box>
}

export default function ControlCenter({ gdkmonitor }: { gdkmonitor: Gdk.Monitor }) {
  let panel: Gtk.Widget | null = null

  return <window name="control-center" namespace="control-center" cssClasses={["control-window"]}
    visible={false}
    marginTop={0} marginRight={0}
    anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
    gdkmonitor={gdkmonitor} application={app}
    keymode={Astal.Keymode.EXCLUSIVE} exclusivity={Astal.Exclusivity.IGNORE}
    $={(self) => {
      const window = self as Astal.Window
      const keys = new Gtk.EventControllerKey()
      keys.connect("key-pressed", (_ctrl, keyval) => {
        if (keyval === Gdk.KEY_Escape) { window.hide(); return true }
        return false
      })
      window.add_controller(keys)
    }}>
    <box cssClasses={["control-backdrop"]} hexpand vexpand
      $={(self) => {
        const backdrop = self as Gtk.Widget
        const clicks = new Gtk.GestureClick()
        clicks.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        clicks.connect("released", (_gesture, _presses, x, y) => {
          const target = backdrop.pick(x, y, Gtk.PickFlags.DEFAULT)
          if (panel && target && (target === panel || target.is_ancestor(panel))) return
          app.get_window("control-center")?.hide()
        })
        backdrop.add_controller(clicks)
      }}>
      <box cssClasses={["panel"]} orientation={Gtk.Orientation.VERTICAL} spacing={4}
        halign={Gtk.Align.END} valign={Gtk.Align.START} marginTop={52} marginEnd={16}
        $={(self) => { panel = self as Gtk.Widget }}>
      <Header />
      <Controls />
      </box>
    </box>
  </window>
}
