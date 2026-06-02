import { createBinding, For, This } from "ags"
import app from "ags/gtk4/app"
import style from "./style.css"
import ControlCenter from "./widget" // Importamos el componente que creamos arriba

app.start({
  css: style,
  gtkTheme: "Adwaita", // Evita que los temas del sistema rompan tus estilos custom
  main() {
    const monitors = createBinding(app, "monitors")

    return (
      <For each={monitors}>
        {(monitor) => (
          <This this={app}>
            <ControlCenter gdkmonitor={monitor} />
          </This>
        )}
      </For>
    )
  },
})
