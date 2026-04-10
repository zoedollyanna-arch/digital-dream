// ============================================
// [Kyori] Digital Dream Notify v1.0
// Notification system - SL popup alerts, IM notifications,
// and HUD visual indicators.
// Place in any prim of the tablet HUD linkset.
// ============================================

// --- Configuration ---
string  SERVER_URL  = "https://digital-dream-jbqb.onrender.com";
float   CHECK_INTERVAL = 10.0;                     // Notification check interval (seconds)
integer GLOW_FACE   = ALL_SIDES;                    // Prim face to glow on notification

// Link message channels
integer CH_NOTIFY    = 3002;
integer CH_CORE      = 3000;
integer CH_MESSENGER = 3001;

// --- State ---
key     gOwner;
string  gOwnerName;
integer gEnabled = TRUE;
integer gHasUnread = FALSE;
key     gCheckRequest = NULL_KEY;

// --- Functions ---
// Flash the HUD to indicate a notification
flashNotify()
{
    if (!gEnabled) return;
    // No visual flash on HUD — notifications are text-only
}

// Send IM notification to the owner
notifyOwner(string title, string message)
{
    if (!gEnabled) return;
    llOwnerSay("📱 " + title + ": " + message);
}

// Check server for unread messages
checkUnread()
{
    gCheckRequest = llHTTPRequest(
        SERVER_URL + "/api/messages/unread?uuid=" + llEscapeURL((string)gOwner),
        [HTTP_METHOD, "GET", HTTP_BODY_MAXLENGTH, 512],
        ""
    );
}

// Set persistent notification glow
setUnreadGlow(integer hasUnread)
{
    gHasUnread = hasUnread;
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

        llSetTimerEvent(CHECK_INTERVAL);
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
        if (num == CH_NOTIFY)
        {
            // Notification commands from other scripts
            if (msg == "ENABLE")
            {
                gEnabled = TRUE;
            }
            else if (msg == "DISABLE")
            {
                gEnabled = FALSE;
                setUnreadGlow(FALSE);
            }
            else if (msg == "CHECK")
            {
                checkUnread();
            }
            else if (llGetSubString(msg, 0, 5) == "ALERT:")
            {
                // Custom alert: "ALERT:title|message"
                string payload = llGetSubString(msg, 6, -1);
                integer sep = llSubStringIndex(payload, "|");
                if (sep > 0)
                {
                    string title = llGetSubString(payload, 0, sep - 1);
                    string message = llGetSubString(payload, sep + 1, -1);
                    notifyOwner(title, message);
                    flashNotify();
                }
            }
            else if (llGetSubString(msg, 0, 6) == "IM_SENT")
            {
                // IM was sent - brief confirmation
                notifyOwner("Message", "Sent successfully.");
            }
            else if (msg == "NEW_MESSAGE")
            {
                // New message received
                notifyOwner("DreamChat", "You have a new message!");
                flashNotify();
                setUnreadGlow(TRUE);
            }
        }
    }

    timer()
    {
        if (gEnabled)
        {
            checkUnread();
        }
    }

    http_response(key req, integer status, list meta, string body)
    {
        if (req == gCheckRequest)
        {
            gCheckRequest = NULL_KEY;
            if (status != 200) return;

            // Parse count from {"count": N}
            integer ci = llSubStringIndex(body, "\"count\":");
            if (ci != -1)
            {
                string numStr = llGetSubString(body, ci + 8, ci + 15);
                // Strip non-numeric
                numStr = llStringTrim(numStr, STRING_TRIM);
                integer i;
                string clean = "";
                for (i = 0; i < llStringLength(numStr); i++)
                {
                    string c = llGetSubString(numStr, i, i);
                    if (c == "0" || c == "1" || c == "2" || c == "3" || c == "4" ||
                        c == "5" || c == "6" || c == "7" || c == "8" || c == "9")
                    {
                        clean += c;
                    }
                    else
                    {
                        i = llStringLength(numStr); // break
                    }
                }

                integer count = (integer)clean;

                if (count > 0 && !gHasUnread)
                {
                    // New unread messages since last check
                    notifyOwner("DreamChat", (string)count + " unread message(s)");
                    flashNotify();
                }
                setUnreadGlow(count > 0);
            }
        }
    }
}
