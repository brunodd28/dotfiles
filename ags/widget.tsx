import GLib from "gi://GLib"
import Astal from "gi://Astal?version=4.0"
import Gtk from "gi://Gtk?version=4.0"
import AstalWp from "gi://AstalWp"
import AstalNetwork from "gi://AstalNetwork"
import AstalBluetooth from "gi://AstalBluetooth"
import AstalPowerProfiles from "gi://AstalPowerProfiles"
import { createBinding, With, For } from "ags"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"
import app from "ags/gtk4/app"
import Pango from "gi://Pango"
import ConnItem from "./ConnItem"

// --- 1. CABECERA (Perfil y Energía combinados) ---
function TopHeader() {
  const uptime = createPoll("", 60000, () => {
    return execAsync("awk '{print int($1/3600)\"h \"int(($1%3600)/60)\"m\"}' /proc/uptime")
        .catch(() => "0h 0m")
  })

  return (
    <box cssClasses={["top-header"]} spacing={10}>
      
      {/* Izquierda: Nombre arriba, Uptime abajo */}
      <box orientation={Gtk.Orientation.VERTICAL} hexpand halign={Gtk.Align.START} valign={Gtk.Align.CENTER}>
        <label cssClasses={["profile-name"]} label="Bruno Durand" halign={Gtk.Align.START} />
        <label cssClasses={["profile-uptime"]} label={uptime} halign={Gtk.Align.START} />
      </box>

      {/* Derecha: Botones de Energía (Solo íconos) */}
      <box spacing={8} halign={Gtk.Align.END} valign={Gtk.Align.CENTER}>
        <button 
          cssClasses={["btn-mini"]} 
          onClicked={() => execAsync("hyprlock").catch(print)}
        >
          <image iconName="system-lock-screen-symbolic" />
        </button>
        
        <button 
          cssClasses={["btn-mini", "btn-power-mini"]} 
          onClicked={() => execAsync("systemctl poweroff").catch(print)}
        >
          <image iconName="system-shutdown-symbolic" />
        </button>
      </box>

    </box>
  )
}

// --- 3. CONECTIVIDAD Y BATERÍA (A prueba de nulos y sin errores de sintaxis) ---
function Connectivity() {
                    const network = AstalNetwork.get_default()
                    const bluetooth = AstalBluetooth.get_default()
                    const power = AstalPowerProfiles.get_default()
                    
                 // Leemos nmcli y armamos los botones directamente en memoria
                      // Escaneamos el aire de verdad usando nmcli
                        const allWifiNetworks = createPoll([], 5000, () => {
                          return execAsync(["bash", "-c", "nmcli -t -f SIGNAL,BSSID,SSID dev wifi list"]).then(out => {
                            return out.split("\n")
                              .filter(line => line.trim() !== "")
                              .map(line => {
                                const parts = line.split(/(?<!\\):/); 
                                if (parts.length >= 3) {
                                  const signal = parseInt(parts[0]);
                                  const ssid = parts.slice(2).join(':').replace(/\\:/g, ':');
                                  if (ssid && ssid !== "--") {
                                    return { 
                                      ssid: ssid, 
                                      bssid: parts[1].replace(/\\:/g, ':'),
                                      icon: signal > 70 ? "network-wireless-signal-excellent-symbolic" : 
                                            signal > 40 ? "network-wireless-signal-good-symbolic" : 
                                                          "network-wireless-signal-ok-symbolic"
                                    };
                                  }
                                }
                                return null;
                              })
                              .filter(ap => ap !== null) // Filtramos los nulos
                              // Opcional: Eliminar duplicados si el mismo SSID sale varias veces con distintas frecuencias
                              .filter((ap, index, self) => index === self.findIndex((t) => t?.ssid === ap?.ssid));
                          }).catch(() => []);
                        });
                    
                    // EL TRUCO MAESTRO: Usamos un Label nativo como gestor de estado. 
                    // Nunca lo dibujamos, solo le cambiamos el texto y lo usamos para crear bindings.
                    const menuState = new Gtk.Label({ label: "none" })
                  
                    const toggleMenu = (menu: string) => {
                      // Si toco el mismo menú, lo cierro ("none"). Si no, abro el nuevo.
                      menuState.label = menuState.label === menu ? "none" : menu
                    }
                  
                    return (
                      <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
                        
                        {/* --- FILA SUPERIOR: Wi-Fi y Bluetooth --- */}
                        <box spacing={10} homogeneous>
                          
                          {/* WI-FI */}
                          <ConnItem 
                            title="Wi-Fi"
                            isActive={createBinding(network.wifi, "enabled")}
                            icon={createBinding(network.wifi, "iconName").as(i => i ? String(i) : "network-wireless-offline-symbolic")}
                            subtitle={createBinding(network.wifi, "ssid").as(s => s ? String(s) : "Desconectado")}
                            onToggle={() => execAsync(network.wifi.enabled ? "nmcli radio wifi off" : "nmcli radio wifi on").catch(print)}
                            onMenuClick={() => toggleMenu("wifi")}
                          />
                  
{/* BLUETOOTH */}
        <ConnItem 
          title="Bluetooth"
          isActive={createBinding(bluetooth, "isPowered")}
          icon="bluetooth-active-symbolic"
          subtitle={createBinding(bluetooth, "isPowered").as(p => p ? "Encendido" : "Apagado")}
          // LA SOLUCIÓN: Usar bluetoothctl nativo en vez de bluetooth.toggle()
          onToggle={() => {
            const cmd = bluetooth.isPowered ? "bluetoothctl power off" : "sudo systemctl start bluetooth && bluetoothctl power on"
            execAsync(cmd).catch(print)
          }}
          onMenuClick={() => toggleMenu("bluetooth")}
        />
                        </box>
                  
    
{/* --- EL ACORDEÓN --- */}
            
            {/* Lista de Wi-Fi */}
            <revealer revealChild={createBinding(menuState, "label").as(l => l === "wifi")}>

      <box 
        cssClasses={["accordion-menu"]} 
        orientation={Gtk.Orientation.VERTICAL} 
        spacing={5}
        visible={createBinding(menuState, "label").as(l => l === "wifi")}
      >
        <label label="Redes Wi-Fi Disponibles" cssClasses={["popover-title"]} />
        
        {/* LA SOLUCIÓN: El componente <For> traduce la lista a elementos visuales */}
        <For each={createBinding(network.wifi, "accessPoints").as(aps => {
          if (!Array.isArray(aps)) return []
          // Filtramos y cortamos los 5 mejores, pero NO hacemos el .map acá
          return aps.filter(ap => ap.ssid).sort((a, b) => b.strength - a.strength).slice(0, 8)
        })}>
          {/* El For se encarga de mapear cada "ap" a un botón */}
          {(ap: any) => (
            <button hexpand halign={Gtk.Align.FILL} onClicked={() => execAsync(`nmcli device wifi connect ${ap.bssid}`).catch(print)}>
              <box spacing={10} halign={Gtk.Align.START}>
                <image iconName={String(ap.iconName || "network-wireless-signal-none-symbolic")} />
                <label label={String(ap.ssid || "Red Oculta")} hexpand halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
              </box>
            </button>
          )}
        </For>
      </box>
            </revealer>
      
{/* Lista de Bluetooth */}
                  <revealer revealChild={createBinding(menuState, "label").as(l => l === "bluetooth")}>
                    <box 
                      cssClasses={["accordion-menu"]} 
                      orientation={Gtk.Orientation.VERTICAL} 
                      spacing={5}
                    >
                      {/* Cabecera con título y botón de escaneo */}
                      <box orientation={Gtk.Orientation.HORIZONTAL}>
                        <label label="Dispositivos Bluetooth" cssClasses={["popover-title"]} hexpand halign={Gtk.Align.START} />
                        
                        {/* Botón mágico: Escanea el aire durante 15 segundos y se apaga solo */}
                        <button 
                          cssClasses={["btn-mini"]} 
                          halign={Gtk.Align.END}
                          onClicked={() => execAsync("timeout 15 bluetoothctl scan on").catch(print)}
                        >
                          <image iconName="view-refresh-symbolic" />
                        </button>
                      </box>
                      
                      <box orientation={Gtk.Orientation.VERTICAL} spacing={5}>
                        <For each={createBinding(bluetooth, "devices").as(devs => {
                          if (!Array.isArray(devs)) return []
                          return devs.slice(0, 5)
                        })}>
                          {(device: any) => (
                            <button hexpand halign={Gtk.Align.FILL} onClicked={() => device.connect_device(() => {})}>
                              <box spacing={10} halign={Gtk.Align.START}>
                                <image iconName={String(device.iconName || "bluetooth-active-symbolic")} />
                                <label label={String(device.name || "Desconocido")} hexpand halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
                              </box>
                            </button>
                          )}
                        </For>
                      </box>
                    </box>
                  </revealer>
      {/* --- FILA INFERIOR: Batería --- */}
      <box spacing={10}>
        <ConnItem 
                  title="Batería"
                  isActive={createBinding(power, "activeProfile").as(p => p === "power-saver")}
                  icon="battery-good-charging-symbolic"
                  subtitle={createBinding(power, "activeProfile").as(p => p === "power-saver" ? "Ahorro" : (p === "performance" ? "Rendimiento" : "Balanceado"))}
                  onToggle={() => {
                    const current = power.activeProfile
                    power.set_active_profile(current === "power-saver" ? "balanced" : "power-saver")
                  }}
                />
        <ConnItem 
                          title="Batería"
                          isActive={createBinding(power, "activeProfile").as(p => p === "power-saver")}
                          icon="battery-good-charging-symbolic"
                          subtitle={createBinding(power, "activeProfile").as(p => p === "power-saver" ? "Ahorro" : (p === "performance" ? "Rendimiento" : "Balanceado"))}
                          onToggle={() => {
                            const current = power.activeProfile
                            power.set_active_profile(current === "power-saver" ? "balanced" : "power-saver")
                          }}
                        />
      </box>
      
    </box>
  )
}

// --- 4. SLIDERS (Audio y Brillo) ---
function AudioSlider() {
  const speaker = AstalWp.get_default()?.defaultSpeaker
  if (!speaker) return <label label="Sin Audio" />

  return (
    <box cssClasses={["slider-box", "volume-box"]} hexpand spacing={10}>
      <image iconName={createBinding(speaker, "volumeIcon")} />
      <slider
        hexpand
        cssClasses={["volume-slider"]}
        drawValue={false}
        onChangeValue={({ value }) => speaker.set_volume(value)}
        value={createBinding(speaker, "volume")}
      />
    </box>
  )
}

function BrightnessSlider() {
  const brightness = createPoll(0, 500, () => {
     return execAsync("bash -c \"echo $(( $(brightnessctl get) * 100 / $(brightnessctl m) ))\"")
        .then(res => parseInt(res) / 100)
        .catch(() => 0)
  })

  return (
    <box cssClasses={["slider-box", "brightness-box"]} hexpand spacing={10}>
      <image iconName="display-brightness-symbolic" />
      <slider
        hexpand
        cssClasses={["brightness-slider"]}
        drawValue={false}
        onChangeValue={({ value }) => execAsync(`brightnessctl set ${Math.floor(value * 100)}%`)}
        value={brightness}
      />
    </box>
  )
}


// --- WIDGET PRINCIPAL ---
export default function ControlCenter({ gdkmonitor }: { gdkmonitor: any }) {
  const { TOP, RIGHT } = Astal.WindowAnchor

  return (
    <window
      name={`control-center-${gdkmonitor.connector}`} 
      namespace="control-center"
      cssClasses={["control-center-window"]}
      visible={false} 
      anchor={TOP | RIGHT}
      marginTop={10}
      marginRight={10}
      gdkmonitor={gdkmonitor}
      application={app}

      keymode={Astal.Keymode.ON_DEMAND}
            
            setup={(self) => {
              const focusCtrl = new Gtk.EventControllerFocus()
              focusCtrl.connect("leave", () => {
                self.visible = false
              })
              self.add_controller(focusCtrl)
            }}
    >
      <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["menu-container"]} spacing={20}>
        
        <TopHeader />
        
        <Connectivity />
        <box orientation={Gtk.Orientation.VERTICAL} cssClasses={["sliders-group"]} spacing={10}>
          <AudioSlider />
          <BrightnessSlider />
        </box>
      </box>
    </window>
  )
}
