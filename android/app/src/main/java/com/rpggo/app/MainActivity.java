package com.rpggo.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Plugin propio (no viene de npm) — hay que registrarlo a mano ANTES de super.onCreate(),
        // que es donde Capacitor termina de armar el bridge con la lista de plugins. Ver
        // BackupFolderPlugin.java: carpeta de backups elegida por el usuario vía Storage Access
        // Framework, la única forma de que un backup sobreviva a una desinstalación.
        registerPlugin(BackupFolderPlugin.class);

        // Edge-to-edge: el WebView dibuja detrás de la barra de estado y la de navegación
        // (fondo del mapa visible bajo la hora/batería) en vez del recorte por defecto de
        // Android. El HUD no se tapa porque el CSS respeta env(safe-area-inset-*) — ver
        // viewport-fit=cover en index.html.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        super.onCreate(savedInstanceState);

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        // Iconos claros: el fondo del juego es oscuro (theme-color #0a0c11).
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
    }
}
