import { createBinding, For, This } from "ags"
import app from "ags/gtk4/app"
import style from "./style.css"
import ControlCenter from "./widget"

app.start({
  css: style,
  requestHandler(argv, response) {
    if (argv[0] === "close-control-center") {
      app.get_window("control-center")?.hide()
      response("Control Center cerrado")
      return
    }

    response("Comando desconocido")
  },
  gtkTheme: "Adwaita",
  main() {
    const monitors = createBinding(app, "monitors")
    return <For each={monitors}>{(monitor) => <This this={app}>
      <ControlCenter gdkmonitor={monitor} />
    </This>}</For>
  },
})
