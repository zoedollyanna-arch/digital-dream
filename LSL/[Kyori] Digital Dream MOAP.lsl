// ============================================
// [Kyori] Digital Dream MOAP Engine v1.0
// Handles MOAP media parameters, screen management,
// and app URL switching. Works alongside Core.
// Place in the SCREEN prim (the prim with the MOAP face)
// ============================================

// --- Configuration ---
string  SERVER_URL = "http://YOUR_SERVER:3000";  // UPDATE to your backend URL
integer MOAP_FACE  = 1;                           // Face number for media display

// Link message channels
integer CH_MOAP = 3010;
integer CH_CORE = 3000;

// --- State ---
key     gOwner;
string  gCurrentUrl = "";
integer gScreenOn = FALSE;

// --- Functions ---
initScreen()
{
    // Set default media params on the MOAP face
    llSetLinkMedia(LINK_THIS, MOAP_FACE, [
        PRIM_MEDIA_AUTO_PLAY, TRUE,
        PRIM_MEDIA_AUTO_SCALE, TRUE,
        PRIM_MEDIA_AUTO_ZOOM, FALSE,
        PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_ANYONE,
        PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_NONE,
        PRIM_MEDIA_WIDTH_PIXELS, 1024,
        PRIM_MEDIA_HEIGHT_PIXELS, 1024
    ]);
    gScreenOn = TRUE;
}

loadUrl(string url)
{
    if (!gScreenOn) initScreen();
    gCurrentUrl = url;

    llSetLinkMedia(LINK_THIS, MOAP_FACE, [
        PRIM_MEDIA_CURRENT_URL, url,
        PRIM_MEDIA_HOME_URL, url
    ]);
}

screenOff()
{
    llClearLinkMedia(LINK_THIS, MOAP_FACE);
    gScreenOn = FALSE;
    gCurrentUrl = "";

    // Darken the prim face to look like a powered-off screen
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_COLOR, MOAP_FACE, <0.05, 0.05, 0.1>, 1.0,
        PRIM_GLOW, MOAP_FACE, 0.0
    ]);
}

screenOn()
{
    // Restore screen appearance
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_COLOR, MOAP_FACE, <1.0, 1.0, 1.0>, 1.0,
        PRIM_GLOW, MOAP_FACE, 0.02
    ]);
    initScreen();
}

// --- Events ---
default
{
    state_entry()
    {
        gOwner = llGetOwner();
        screenOff();  // Start powered off
        llOwnerSay("📺 MOAP Engine ready.");
    }

    on_rez(integer start)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER)
            llResetScript();
    }

    link_message(integer sender, integer num, string msg, key id)
    {
        if (num == CH_MOAP)
        {
            // Direct URL load command
            if (msg == "SCREEN_OFF")
            {
                screenOff();
            }
            else if (msg == "SCREEN_ON")
            {
                screenOn();
            }
            else if (llGetSubString(msg, 0, 3) == "URL:")
            {
                // Load a specific URL: "URL:https://example.com/page.html"
                string url = llGetSubString(msg, 4, -1);
                screenOn();
                loadUrl(url);
            }
            else if (msg == "REFRESH")
            {
                // Reload current page
                if (gCurrentUrl != "")
                {
                    loadUrl(gCurrentUrl);
                }
            }
        }
    }

    // When the prim face with media is clicked, MOAP handles it natively
    // No touch_start needed here since Core handles the menu
}
