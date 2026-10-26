-- ~/.config/hypr/hyprland.lua
-- Configuración para Hyprland Lua (0.55+ / preparada para 0.57+)

--------------------------------------------------
-- VARIABLES
--------------------------------------------------

local mod = "SUPER"
local mod2 = "SUPER + SHIFT"

local terminal = "alacritty"
local fileManager = "dolphin"
local menu = "rofi -show drun"
local lock = "hyprlock"

local screenshot = 'grim -g "$(slurp)" - | wl-copy'


--------------------------------------------------
-- VARIABLES DE ENTORNO
--------------------------------------------------

hl.env("XCURSOR_THEME", "MacTahoe-cursors")
hl.env("XCURSOR_SIZE", "24")


--------------------------------------------------
-- MONITOR
--------------------------------------------------

hl.monitor({
    output = "",
    mode = "1920x1080@120",
    position = "0x0",
    scale = 1.25,
})


--------------------------------------------------
-- INICIO AUTOMÁTICO
--------------------------------------------------

hl.on("hyprland.start", function()
	hl.exec_cmd("hyprlock")
    hl.exec_cmd("waybar")
    hl.exec_cmd("hypridle")
    hl.exec_cmd("hyprpaper")
    hl.exec_cmd("ags run ~/.config/ags/app.tsx")
    hl.exec_cmd("hyprctl setcursor MacTahoe-cursors 24")
end)


--------------------------------------------------
-- REGLAS DE CAPAS
--------------------------------------------------

hl.layer_rule({
    match = {
        namespace = "control-center",
    },
    blur = true,
})

hl.layer_rule({
    match = {
        namespace = "control-center",
    },
    ignore_alpha = 0.1,
})


--------------------------------------------------
-- CONFIGURACIÓN GENERAL
--------------------------------------------------

hl.config({

    xwayland = {
        force_zero_scaling = true,
    },

    general = {
        gaps_in = 2,
        gaps_out = 0,
        border_size = 1,

        col = {
            active_border = "rgba(bfbfbfee)",
            inactive_border = "rgba(303030aa)",
        },
    },

    decoration = {
        rounding = 2,

        blur = {
            enabled = true,
            size = 8,
            passes = 3,
            vibrancy = 0.15,
        },
    },

    input = {
        touchpad = {
            natural_scroll = true,
        },
    },
})


--------------------------------------------------
-- WORKSPACES 1-6
--------------------------------------------------

for i = 1, 6 do

    -- SUPER + número
    -- Cambiar al workspace
    hl.bind(
        mod .. " + " .. i,
        hl.dsp.focus({
            workspace = i,
        })
    )

    -- SUPER + SHIFT + número
    -- Mover ventana al workspace
    hl.bind(
        mod2 .. " + " .. i,
        hl.dsp.window.move({
            workspace = i,
        })
    )

end


--------------------------------------------------
-- CAMBIAR WORKSPACE CON RUEDA
--------------------------------------------------

hl.bind(
    mod .. " + mouse_up",
    hl.dsp.focus({
        workspace = "e+1",
    }),
    {
        mouse = true,
    }
)

hl.bind(
    mod .. " + mouse_down",
    hl.dsp.focus({
        workspace = "e-1",
    }),
    {
        mouse = true,
    }
)


--------------------------------------------------
-- FOCO DE VENTANAS
--------------------------------------------------

hl.bind(
    mod .. " + LEFT",
    hl.dsp.focus({
        direction = "l",
    })
)

hl.bind(
    mod .. " + RIGHT",
    hl.dsp.focus({
        direction = "r",
    })
)

hl.bind(
    mod .. " + UP",
    hl.dsp.focus({
        direction = "u",
    })
)

hl.bind(
    mod .. " + DOWN",
    hl.dsp.focus({
        direction = "d",
    })
)


--------------------------------------------------
-- VENTANAS Y APLICACIONES
--------------------------------------------------

-- Abrir terminal
hl.bind(
    mod .. " + C",
    hl.dsp.exec_cmd(terminal)
)

-- Cerrar ventana
hl.bind(
    mod .. " + Q",
    hl.dsp.window.close()
)

-- Salir de Hyprland
hl.bind(
    mod .. " + M",
    hl.dsp.exit()
)

-- Abrir administrador de archivos
hl.bind(
    mod .. " + E",
    hl.dsp.exec_cmd(fileManager)
)

-- Toggle floating
hl.bind(
    mod .. " + V",
    hl.dsp.window.float()
)

-- Abrir Rofi
hl.bind(
    mod .. " + SPACE",
    hl.dsp.exec_cmd(menu)
)

-- Bloquear pantalla
hl.bind(
    mod2 .. " + Q",
    hl.dsp.exec_cmd(lock)
)


--------------------------------------------------
-- BRILLO
--------------------------------------------------

hl.bind(
    "XF86MonBrightnessDown",
    hl.dsp.exec_cmd("brightnessctl s 5%-")
)

hl.bind(
    "XF86MonBrightnessUp",
    hl.dsp.exec_cmd("brightnessctl s +5%")
)


--------------------------------------------------
-- AUDIO
--------------------------------------------------

hl.bind(
    "XF86AudioRaiseVolume",
    hl.dsp.exec_cmd(
        "wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+"
    )
)

hl.bind(
    "XF86AudioLowerVolume",
    hl.dsp.exec_cmd(
        "wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"
    )
)

hl.bind(
    "XF86AudioMute",
    hl.dsp.exec_cmd(
        "wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"
    )
)


--------------------------------------------------
-- MULTIMEDIA
--------------------------------------------------

hl.bind(
    "XF86AudioPlay",
    hl.dsp.exec_cmd("playerctl play-pause")
)

hl.bind(
    "XF86AudioNext",
    hl.dsp.exec_cmd("playerctl next")
)

hl.bind(
    "XF86AudioPrev",
    hl.dsp.exec_cmd("playerctl previous")
)


--------------------------------------------------
-- APLICACIONES
--------------------------------------------------

hl.bind(
    mod .. " + F1",
    hl.dsp.exec_cmd("brave")
)

hl.bind(
    mod .. " + F2",
    hl.dsp.exec_cmd("flatpak run com.spotify.Client")
)


--------------------------------------------------
-- CAPTURA DE PANTALLA
--------------------------------------------------

hl.bind(
    mod .. " + SHIFT + S",
    hl.dsp.exec_cmd(screenshot)
)


