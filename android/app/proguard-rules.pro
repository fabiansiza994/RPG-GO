# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================
# Capacitor — los plugins se cargan por reflexión (Bridge lee
# android/app/src/main/assets/capacitor.plugins.json y hace Class.forName()
# con esos nombres, y despacha @PluginMethod también por reflexión). Si R8
# renombra o elimina estas clases la app crashea al arrancar un plugin en
# vez de fallar en build. Se mantiene todo el paquete completo — el costo
# en tamaño es mínimo comparado con el riesgo de un crash en producción.
# ============================================================
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# Plugins oficiales registrados en capacitor.plugins.json (@capacitor/app,
# filesystem, geolocation, local-notifications, share, splash-screen).
-keep class com.capacitorjs.plugins.** { *; }

# @capacitor-community/admob — plugin de comunidad, no se confirmó que traiga
# sus propias reglas consumer-proguard empaquetadas, así que se protege acá.
-keep class com.getcapacitor.community.admob.** { *; }

# Puente WebView <-> JS (Capacitor lo usa internamente para el bridge nativo).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
