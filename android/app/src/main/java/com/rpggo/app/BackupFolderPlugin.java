package com.rpggo.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Carpeta de backups elegida por el usuario, vía Storage Access Framework (ACTION_OPEN_DOCUMENT_TREE) —
 * a diferencia de Directory.Data/Cache (@capacitor/filesystem, ver saveTransfer.js), un árbol de
 * documentos SAF vive en almacenamiento compartido de verdad y SOBREVIVE a una desinstalación de la
 * app. No existe un plugin de Capacitor listo para esto en el proyecto, por eso es un plugin propio.
 * El permiso persistente (takePersistableUriPermission) dura mientras el usuario no revoque el
 * acceso a mano y sigue siendo válido entre reinicios de la app — pero NO sobrevive una
 * desinstalación (el sistema operativo invalida los permisos SAF de un paquete al desinstalarlo),
 * así que tras reinstalar hace falta volver a elegir la carpeta — el propio archivo JSON ya guardado
 * ahí, en cambio, sigue intacto en disco y main.js lo detecta y ofrece restaurarlo (ver
 * maybeOfferRestoreFromBackupFolder en main.js).
 */
@CapacitorPlugin(name = "BackupFolder")
public class BackupFolderPlugin extends Plugin {

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Selección cancelada");
            return;
        }
        Uri treeUri = result.getData().getData();
        if (treeUri == null) {
            call.reject("No se pudo obtener la carpeta elegida");
            return;
        }
        try {
            getContext().getContentResolver()
                .takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        } catch (SecurityException e) {
            call.reject("No se pudo guardar el permiso de la carpeta", e);
            return;
        }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), treeUri);
        JSObject ret = new JSObject();
        ret.put("uri", treeUri.toString());
        ret.put("name", dir != null && dir.getName() != null ? dir.getName() : treeUri.toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void isFolderValid(PluginCall call) {
        String uriStr = call.getString("uri");
        JSObject ret = new JSObject();
        ret.put("valid", isValid(uriStr));
        call.resolve(ret);
    }

    private boolean isValid(String uriStr) {
        if (uriStr == null) return false;
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            return dir != null && dir.exists() && dir.canWrite();
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void writeFile(PluginCall call) {
        String uriStr = call.getString("uri");
        String filename = call.getString("filename");
        String contents = call.getString("contents");
        if (uriStr == null || filename == null || contents == null) {
            call.reject("Faltan parámetros");
            return;
        }
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            if (dir == null || !dir.exists()) {
                call.reject("La carpeta ya no existe o no es accesible");
                return;
            }
            DocumentFile existing = dir.findFile(filename);
            DocumentFile target = existing != null ? existing : dir.createFile("application/json", filename);
            if (target == null) {
                call.reject("No se pudo crear el archivo");
                return;
            }
            ContentResolver resolver = getContext().getContentResolver();
            try (OutputStream out = resolver.openOutputStream(target.getUri(), "wt")) {
                if (out == null) {
                    call.reject("No se pudo abrir el archivo para escribir");
                    return;
                }
                out.write(contents.getBytes(StandardCharsets.UTF_8));
            }
            JSObject ret = new JSObject();
            ret.put("uri", target.getUri().toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("No se pudo escribir el archivo", e);
        }
    }

    @PluginMethod
    public void listFiles(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) {
            call.reject("Falta la carpeta");
            return;
        }
        try {
            DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            if (dir == null || !dir.exists()) {
                call.reject("La carpeta ya no existe o no es accesible");
                return;
            }
            JSArray files = new JSArray();
            for (DocumentFile f : dir.listFiles()) {
                if (f.isFile() && f.getName() != null && f.getName().endsWith(".json")) {
                    JSObject item = new JSObject();
                    item.put("name", f.getName());
                    item.put("uri", f.getUri().toString());
                    item.put("lastModified", f.lastModified());
                    files.put(item);
                }
            }
            JSObject ret = new JSObject();
            ret.put("files", files);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("No se pudo listar la carpeta", e);
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String fileUriStr = call.getString("fileUri");
        if (fileUriStr == null) {
            call.reject("Falta el archivo");
            return;
        }
        try {
            ContentResolver resolver = getContext().getContentResolver();
            try (InputStream in = resolver.openInputStream(Uri.parse(fileUriStr))) {
                if (in == null) {
                    call.reject("No se pudo abrir el archivo");
                    return;
                }
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
                JSObject ret = new JSObject();
                ret.put("contents", bos.toString("UTF-8"));
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("No se pudo leer el archivo", e);
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String fileUriStr = call.getString("fileUri");
        if (fileUriStr == null) {
            call.reject("Falta el archivo");
            return;
        }
        try {
            DocumentFile file = DocumentFile.fromSingleUri(getContext(), Uri.parse(fileUriStr));
            if (file != null) file.delete();
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo borrar el archivo", e);
        }
    }
}
