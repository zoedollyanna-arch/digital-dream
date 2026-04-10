// ============================================
// [Kyori] Digital Dream Core v1.0
// Main HUD controller - touch detection, MOAP routing, owner validation
// Place in ROOT prim of the tablet HUD
// ============================================

// --- Configuration ---
string  SERVER_URL  = "http://YOUR_SERVER:3000";  // UPDATE to your backend URL
integer MOAP_FACE   = 1;                            // Prim face for MOAP display
integer SCREEN_LINK = LINK_THIS;                    // Link number of screen prim (LINK_THIS if root)

// Link message channels (for inter-script communication)
integer CH_MESSENGER = 3001;
integer CH_NOTIFY    = 3002;
integer CH_CORE      = 3000;

// --- State ---
key     gOwner;
string  gOwnerName;
integer gOwnerChan;
integer gListenHandle;
string  gCurrentApp = "home";

// --- Functions ---
integer ownerChan(key id)
{
    return -1 - (integer)("0x" + llGetSubString((string)id, 0, 7));
}

// Set MOAP URL on the screen face
setScreen(string page)
{
    string url = SERVER_URL + "/" + page
        + "?uuid=" + llEscapeURL((string)gOwner)
        + "&name=" + llEscapeURL(gOwnerName);

    llSetLinkMedia(SCREEN_LINK, MOAP_FACE, [
        PRIM_MEDIA_CURRENT_URL, url,
        PRIM_MEDIA_HOME_URL, url,
        PRIM_MEDIA_AUTO_PLAY, TRUE,
        PRIM_MEDIA_AUTO_SCALE, TRUE,
        PRIM_MEDIA_AUTO_ZOOM, FALSE,
        PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_ANYONE,
        PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_NONE,
        PRIM_MEDIA_WIDTH_PIXELS, 1024,
        PRIM_MEDIA_HEIGHT_PIXELS, 1024
    ]);
}

clearScreen()
{
    llClearLinkMedia(SCREEN_LINK, MOAP_FACE);
}

showMainMenu(key user)
{
    gOwnerChan = ownerChan(user);
    if (gListenHandle) llListenRemove(gListenHandle);
    gListenHandle = llListen(gOwnerChan, "", user, "");

    llDialog(user,
        "\n📱 Digital Dream Tablet\n\nChoose an app:",
        ["DreamChat", "DreamTube", "Weather",
         "Market", "Browser", "Discord",
         "Texts", "Settings", "Power Off"],
        gOwnerChan
    );
}

routeApp(string app)
{
    // Map menu button names to HTML page files
    if      (app == "DreamChat")  { gCurrentApp = "messages"; setScreen("messages.html"); }
    else if (app == "DreamTube")  { gCurrentApp = "youtube";  setScreen("youtube.html"); }
    else if (app == "Weather")    { gCurrentApp = "weather";  setScreen("weather.html"); }
    else if (app == "Market")     { gCurrentApp = "marketplace"; setScreen("marketplace.html"); }
    else if (app == "Browser")    { gCurrentApp = "browser";  setScreen("browser.html"); }
    else if (app == "Discord")    { gCurrentApp = "discord";  setScreen("discord.html"); }
    else if (app == "Texts")      { gCurrentApp = "messages"; setScreen("messages.html?tab=texts"); }
    else if (app == "Settings")   { gCurrentApp = "settings"; setScreen("settings.html"); }
    else if (app == "Power Off")
    {
        clearScreen();
        gCurrentApp = "off";
        llOwnerSay("📱 Digital Dream powered off.");
        return;
    }
    else if (app == "Home")
    {
        gCurrentApp = "home";
        setScreen("index.html");
    }

    llOwnerSay("📱 Opening " + app + "...");
}

registerWithServer()
{
    // Register this avatar with the backend server
    string body = "{\"action\":\"REGISTER\","
        + "\"uuid\":\"" + (string)gOwner + "\","
        + "\"name\":\"" + gOwnerName + "\"}";
    llHTTPRequest(SERVER_URL + "/api/sl/bridge", [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_BODY_MAXLENGTH, 1024
    ], body);
}

// --- Events ---
default
{
    state_entry()
    {
        gOwner = llGetOwner();
        gOwnerName = llGetDisplayName(gOwner);
        if (gOwnerName == "" || gOwnerName == "???")
            gOwnerName = llKey2Name(gOwner);
        llOwnerSay("📱 Digital Dream Tablet v1.0 ready. Touch to open.");
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

    touch_start(integer n)
    {
        key toucher = llDetectedKey(0);
        if (toucher != gOwner) return;

        if (gCurrentApp == "off" || gCurrentApp == "")
        {
            // Power on - show home screen
            gCurrentApp = "home";
            setScreen("index.html");
            registerWithServer();
            llOwnerSay("📱 Digital Dream powered on!");
        }

        showMainMenu(toucher);
    }

    listen(integer ch, string name, key id, string msg)
    {
        if (ch != gOwnerChan) return;
        if (id != gOwner) return;

        routeApp(msg);
    }

    // Handle link messages from other scripts
    link_message(integer sender, integer num, string msg, key id)
    {
        if (num == CH_CORE)
        {
            if (msg == "RETURN_HOME")
            {
                gCurrentApp = "home";
                setScreen("index.html");
            }
            else if (msg == "SHOW_MENU")
            {
                showMainMenu(gOwner);
            }
            else if (msg == "POWER_OFF")
            {
                clearScreen();
                gCurrentApp = "off";
            }
        }
    }

    http_response(key req, integer status, list meta, string body)
    {
        // Server registration response - silent
    }
}
