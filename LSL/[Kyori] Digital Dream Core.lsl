// ============================================
// [Kyori] Digital Dream Core v1.0
// Main HUD controller - touch detection, MOAP routing, owner validation
// Place in ROOT prim of the tablet HUD
// ============================================

// --- Configuration ---
string  SERVER_URL  = "https://digital-dream-jbqb.onrender.com";
integer MOAP_FACE   = 4;                            // Face 4 on link 2 = MOAP screen
integer SCREEN_LINK = 2;                            // Link 2 = MOAP screen prim
integer IPAD_LINK   = 1;                            // Link 1 = iPad HUD outline

// Link message channels (for inter-script communication)
integer CH_MESSENGER = 3001;
integer CH_NOTIFY    = 3002;
integer CH_CORE      = 3000;
integer CH_MOAP      = 3010;

// --- State ---
key     gOwner;
string  gOwnerName;
integer gOwnerChan;
integer gListenHandle;
string  gCurrentApp = "off";

// --- Functions ---
integer ownerChan(key id)
{
    return -1 - (integer)("0x" + llGetSubString((string)id, 0, 7));
}

// Tell MOAP script to load a page URL on the screen
setScreen(string page)
{
    string url = SERVER_URL + "/" + page
        + "?uuid=" + llEscapeURL((string)gOwner)
        + "&name=" + llEscapeURL(gOwnerName);

    llMessageLinked(LINK_SET, CH_MOAP, "URL:" + url, gOwner);
}

clearScreen()
{
    llMessageLinked(LINK_SET, CH_MOAP, "SCREEN_OFF", gOwner);
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
        return;
    }
    else if (app == "Home")
    {
        gCurrentApp = "home";
        setScreen("index.html");
    }
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

        // Auto-boot: show loading screen immediately on attach/rez
        if (llGetAttached() != 0)
        {
            gCurrentApp = "boot";
            setScreen("boot.html");
            registerWithServer();
        }
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

    attach(key id)
    {
        if (id != NULL_KEY)
        {
            // Just attached — auto-boot if not already running
            if (gCurrentApp == "off" || gCurrentApp == "")
            {
                gOwner = llGetOwner();
                gOwnerName = llGetDisplayName(gOwner);
                if (gOwnerName == "" || gOwnerName == "???")
                    gOwnerName = llKey2Name(gOwner);
                gCurrentApp = "boot";
                setScreen("boot.html");
                registerWithServer();
            }
        }
    }

    touch_start(integer n)
    {
        key toucher = llDetectedKey(0);
        if (toucher != gOwner) return;

        // Only respond to touches on the iPad HUD outline (link 1)
        integer link = llDetectedLinkNumber(0);
        if (link != IPAD_LINK) return;

        if (gCurrentApp == "off" || gCurrentApp == "")
        {
            // Power on from off state — boot sequence
            gCurrentApp = "boot";
            setScreen("boot.html");
            registerWithServer();
            return;
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
