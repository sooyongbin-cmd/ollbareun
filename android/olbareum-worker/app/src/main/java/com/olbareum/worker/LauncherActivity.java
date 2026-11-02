package com.olbareum.worker;

import android.net.Uri;

/** Uses the browser's TWA implementation; no WebView bridge or embedded credentials. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    @Override
    protected Uri getLaunchingUrl() {
        Uri requested = super.getLaunchingUrl();
        String path = requested.getPath();
        if ("https".equals(requested.getScheme())
                && "www.olbareum.com".equals(requested.getHost())
                && ("/guard".equals(path) || (path != null && path.startsWith("/guard/")))) {
            return requested;
        }
        return Uri.parse("https://www.olbareum.com/guard");
    }
}
