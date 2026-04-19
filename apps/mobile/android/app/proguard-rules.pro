# Add project specific ProGuard rules here.

# React Native — keep critical classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Razorpay
-keep class com.razorpay.** { *; }
-keepattributes *Annotation*
-dontwarn com.razorpay.**

# OkHttp/Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# Suppress warnings from Firebase Messaging reflection
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }
