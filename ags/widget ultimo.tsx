import Astal from "gi://Astal?version=4.0"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk?version=4.0"
import Gdk from "gi://Gdk?version=4.0"
import AstalNetwork from "gi://AstalNetwork"
import AstalBluetooth from "gi://AstalBluetooth"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import AstalWp from "gi://AstalWp"
import { createBinding, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import Pango from "gi://Pango"

const batteryLimit = "/sys/class/power_supply/BAT0/charge_control_end_threshold"
const airplayIcon = `${GLib.get_user_config_dir()}/ags/airplay-symbolic.svg`
const hasNightLight = GLib.find_program_in_path("hyprsunset") !== null
const run = (command: string[]) => execAsync(command).catch((error) => print(error))
const setPointer = (self: Gtk.Widget) => self.set_cursor_from_name("pointer")

function SliderRow({ title, value, onChange }: any) {
  const lowIcon = title === "Volumen" ? "audio-volume-muted-symbolic" : "display-brightness-symbolic"
  const highIcon = title === "Volumen" ? "audio-volume-high-symbolic" : "display-brightness-symbolic"
  return <box cssClasses={["slider-card"]} orientation={Gtk.Orientation.VERTICAL} spacing={5}>
    <label label={title} cssClasses={["slider-label"]} halign={Gtk.Align.START} />
    <box cssClasses={["slider-control"]} spacing={8}>
      <image iconName={lowIcon} cssClasses={["slider-icon"]} />
      <slider hexpand min={0} max={1} value={value} onChangeValue={({ value: next }) => onChange(next)} />
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
    <button cssClasses={["icon-button"]} tooltipText="Bloquear" onClicked={() => run(["hyprlock"])} $={setPointer}>
      <image iconName="system-lock-screen-symbolic" />
    </button>
    <button cssClasses={["icon-button"]} tooltipText="Suspender" onClicked={() => run(["systemctl", "suspend"])} $={setPointer}>
      <image iconName="weather-clear-night-symbolic" />
    </button>
    <button cssClasses={["icon-button"]} tooltipText="Reiniciar" onClicked={() => run(["systemctl", "reboot"])} $={setPointer}>
      <image iconName="system-reboot-symbolic" />
    </button>
    <button cssClasses={["icon-button", "danger"]} tooltipText="Apagar" onClicked={() => run(["systemctl", "poweroff"])} $={setPointer}>
      <image iconName="system-shutdown-symbolic" />
    </button>
  </box>
}

function Tile({ icon, iconFile, title, subtitle, active, onToggle, onOpen, actionHint }: any) {
  return <box cssClasses={active ? active.as((value: boolean) => value ? ["tile", "tile-active"] : ["tile"]) : ["tile"]}>
    <button cssClasses={["tile-icon"]} onClicked={onToggle} tooltipText={actionHint || `${title}: activar/desactivar`} $={setPointer}>
      {iconFile ? <image $={(self) => self.set_from_file(iconFile)} /> : <image iconName={icon} />}
    </button>
    <button cssClasses={["tile-copy"]} hexpand onClicked={onOpen || onToggle} tooltipText={actionHint} $={setPointer}>
      <box orientation={Gtk.Orientation.VERTICAL} halign={Gtk.Align.START}>
        <label label={title} cssClasses={["tile-title"]} halign={Gtk.Align.START} />
        <label label={subtitle} cssClasses={["tile-subtitle"]} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
      </box>
    </button>
    {onOpen && <button cssClasses={["tile-chevron"]} onClicked={onOpen} $={setPointer}><image iconName="go-next-symbolic" /></button>}
  </box>
}

function Connectivity() {
  const network = AstalNetwork.get_default()
  const bluetooth = AstalBluetooth.get_default()
  const speaker = AstalWp.get_default().defaultSpeaker
  const wifi = network.wifi
  const brightness = createPoll(0.5, 5_000, () => execAsync(["bash", "-lc", "brightnessctl -m | awk -F, '{gsub(/%/, \"\", $5); print $5/100}'"])
    .then((value) => Math.max(0, Math.min(1, Number(value.trim()) || 0)))
    .catch(() => 0.5))
  const accessPoints = createPoll([], 15_000, () => {
    if (!wifi.enabled) return []
    return execAsync(["nmcli", "-t", "--escape", "yes", "-f", "SSID,SIGNAL,IN-USE", "device", "wifi", "list"])
      .then((text) => text.split("\n").filter(Boolean).map((line) => {
        const [ssid, signal, inUse] = line.split(":")
        return { ssid: ssid?.replaceAll("\\:", ":"), signal: Number(signal), inUse: inUse === "*" }
      }).filter((item) => item.ssid).sort((a, b) => Number(b.inUse) - Number(a.inUse) || b.signal - a.signal).slice(0, 6))
      .catch(() => [])
  })
  const showWifi = () => {
    const dialog = new Gtk.Window({ title: "Redes Wi-Fi", modal: true, transientFor: app.get_window("control-center"), defaultWidth: 300 })
    const list = <box orientation={Gtk.Orientation.VERTICAL} spacing={6} cssClasses={["network-list"]}>
      <label label="Redes disponibles" cssClasses={["section-label"]} halign={Gtk.Align.START} />
      <For each={accessPoints}>{(point: any) => <button cssClasses={["network-row"]} $={setPointer} onClicked={() => {
        dialog.close()
        run(["nmcli", "device", "wifi", "connect", point.ssid])
      }}><box spacing={10}><image iconName={point.inUse ? "network-wireless-signal-excellent-symbolic" : "network-wireless-signal-good-symbolic"} />
        <label label={point.ssid} hexpand halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
        {point.inUse && <image iconName="object-select-symbolic" />}
      </box></button>}</For>
      <button cssClasses={["network-row"]} $={setPointer} onClicked={() => { run(["nmcli", "device", "wifi", "rescan"]); dialog.close() }}>
        <label label="Buscar redes" halign={Gtk.Align.START} />
      </button>
    </box>
    dialog.child = list
    dialog.present()
  }

  return <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
    <box spacing={8} homogeneous>
      <Tile title="Wi-Fi" icon={createBinding(wifi, "iconName").as((icon) => String(icon || "network-wireless-offline-symbolic"))}
        subtitle={createBinding(wifi, "ssid").as((ssid) => String(ssid || (wifi.enabled ? "Desconectado" : "Apagado")))}
        active={createBinding(wifi, "enabled")}
        onToggle={() => run(["nmcli", "radio", "wifi", wifi.enabled ? "off" : "on"])} onOpen={showWifi} />
      <Tile title="Bluetooth" icon="bluetooth-active-symbolic"
        subtitle={createBinding(bluetooth, "isPowered").as((powered) => powered ? "Encendido" : "Apagado")}
        active={createBinding(bluetooth, "isPowered")}
        onToggle={() => run(["bluetoothctl", "power", bluetooth.isPowered ? "off" : "on"])} />
    </box>
    <SliderRow title="Volumen"
      value={createBinding(speaker, "volume")} onChange={(value: number) => speaker.set_volume(value)} />
    <SliderRow title="Brillo"
      value={brightness} onChange={(value: number) => run(["brightnessctl", "set", `${Math.round(value * 100)}%`])} />
  </box>
}

function Controls() {
  const power = AstalPowerProfiles.get_default()
  const battery = createPoll("", 30_000, () => execAsync(["cat", batteryLimit]).catch(() => ""))
  const airplay = createPoll(false, 1_000, () => execAsync(["pgrep", "-x", "uxplay"])
    .then(() => true).catch(() => false))
  const night = createPoll(false, 2000, () => execAsync(["hyprctl", "-j", "hyprsunset"])
    .then((out) => JSON.parse(out).identity === false).catch(() => false))
  const setBatteryLimit = () => run(["pkexec", "sh", "-c", `echo 80 > ${batteryLimit}`])
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

  return <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
    <Connectivity />
    <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
      <box spacing={8} homogeneous>
        <Tile title="Luz nocturna" icon="weather-clear-night-symbolic"
          subtitle={hasNightLight ? night.as((enabled) => enabled ? "Cálida · 4500 K" : "Desactivada") : "Requiere hyprsunset"}
          active={night} onToggle={() => hasNightLight && toggleNight()} />
        <Tile title="Ahorro" icon="power-profile-power-saver-symbolic"
          subtitle={createBinding(power, "activeProfile").as((profile) => ({ "power-saver": "Activo", balanced: "Equilibrado", performance: "Rendimiento" }[String(profile)] || String(profile)))}
          active={createBinding(power, "activeProfile").as((profile) => profile === "power-saver")}
          onToggle={() => power.set_active_profile(power.activeProfile === "power-saver" ? "balanced" : "power-saver")} />
      </box>
      <box spacing={8} homogeneous>
        <Tile title="Límite de carga" icon="battery-good-symbolic"
          subtitle={battery.as((value) => value.trim() === "80" ? "80% activo" : `${value.trim() || "—"}% → 80%`)}
          active={battery.as((value) => value.trim() === "80")}
          onToggle={setBatteryLimit} actionHint="Establecer el límite en 80%" />
        <Tile title="AirPlay" iconFile={airplayIcon}
          subtitle={airplay.as((enabled) => enabled ? "Receptor activo" : "Iniciar receptor")}
          active={airplay} onToggle={toggleAirplay}
          actionHint={airplay.as((enabled) => enabled ? "Apagar el receptor AirPlay" : "Iniciar el receptor AirPlay con uxplay")} />
      </box>
      <label label="Cambiar el límite solicita autorización de administrador." cssClasses={["helper-text"]} halign={Gtk.Align.START} />
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
      const keys = new Gtk.EventControllerKey()
      keys.connect("key-pressed", (_ctrl, keyval) => {
        if (keyval === Gdk.KEY_Escape) { self.hide(); return true }
        return false
      })
      self.add_controller(keys)
    }}>
    <box cssClasses={["control-backdrop"]} hexpand vexpand
      $={(self) => {
        const clicks = new Gtk.GestureClick()
        clicks.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        clicks.connect("released", (_gesture, _presses, x, y) => {
          const target = self.pick(x, y, Gtk.PickFlags.DEFAULT)
          if (panel && target && (target === panel || target.is_ancestor(panel))) return
          app.get_window("control-center")?.hide()
        })
        self.add_controller(clicks)
      }}>
      <box cssClasses={["panel"]} orientation={Gtk.Orientation.VERTICAL} spacing={16}
        halign={Gtk.Align.END} valign={Gtk.Align.START} marginTop={52} marginEnd={16}
        $={(self) => { panel = self }}>
      <Header />
      <Controls />
      </box>
    </box>
  </window>
}
