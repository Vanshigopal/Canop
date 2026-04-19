package app.raquel.mobile

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript. Must
     * match `appName` in app.json + AppRegistry.registerComponent in index.js.
     */
    override fun getMainComponentName(): String = "Raquel"

    /**
     * Returns the instance of [ReactActivityDelegate]. We use
     * [DefaultReactActivityDelegate] which allows you to enable New
     * Architecture with a single boolean flag [fabricEnabled].
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
