import Gtk from "gi://Gtk?version=4.0"
import Pango from "gi://Pango"

export default function ConnItem({ title, icon, subtitle, isActive, onToggle, onMenuClick }: any) {
  return (
    <box cssClasses={["conn-module"]} hexpand>
      
      {/* Círculo a la izquierda (prende/apaga) */}
      <button 
        cssClasses={isActive.as((a: boolean) => a ? ["toggle-circle", "active"] : ["toggle-circle"])}
        onClicked={onToggle}
        valign={Gtk.Align.CENTER}
      >
        <image iconName={icon} />
      </button>

      {/* Lógica Condicional: ¿Tiene acción de menú o es botón directo? */}
      {onMenuClick ? (
        // Variante que abre el acordeón (Wi-Fi, BT)
        <button cssClasses={["conn-menu-btn"]} hexpand onClicked={onMenuClick}>
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label cssClasses={["conn-title"]} label={title} halign={Gtk.Align.START} />
            <label cssClasses={["conn-subtitle"]} label={subtitle} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
          </box>
        </button>
      ) : (
        // Variante Botón Directo (Batería)
        <button cssClasses={["conn-menu-btn"]} hexpand onClicked={onToggle}>
          <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
            <label cssClasses={["conn-title"]} label={title} halign={Gtk.Align.START} />
            <label cssClasses={["conn-subtitle"]} label={subtitle} halign={Gtk.Align.START} ellipsize={Pango.EllipsizeMode.END} />
          </box>
        </button>
      )}
      
    </box>
  )
}
