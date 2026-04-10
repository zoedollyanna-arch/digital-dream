// ============================================
// [Kyori] Digital Dream Messenger v1.0
// Handles SL IM integration - sends/receives instant messages
// and bridges them to the backend for the DreamChat inbox.
// Place in any prim of the tablet HUD linkset.
// ============================================

// --- Configuration ---
string  SERVER_URL = "http://YOUR_SERVER:3000";  // UPDATE to your backend URL
float   POLL_INTERVAL = 5.0;                      // How often to check for pending messages (seconds)

// Link message channels
integer CH_MESSENGER = 3001;
integer CH_CORE      = 3000;
integer CH_NOTIFY    = 3002;

// --- State ---
key     gOwner;
string  gOwnerName;
key     gPollRequest = NULL_KEY;
integer gActive = FALSE;

// --- Functions ---
startPolling()
{
    gActive = TRUE;
    llSetTimerEvent(POLL_INTERVAL);
    pollServer();
}

stopPolling()
{
    gActive = FALSE;
    llSetTimerEvent(0.0);
}

// Poll the backend for pending SL IM actions
pollServer()
{
    string body = "{\"action\":\"POLL_ACTIONS\","
        + "\"uuid\":\"" + (string)gOwner + "\","
        + "\"name\":\"" + gOwnerName + "\"}";
    gPollRequest = llHTTPRequest(SERVER_URL + "/api/sl/bridge", [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_BODY_MAXLENGTH, 2048
    ], body);
}

// Forward an incoming SL IM to the backend for storage
forwardImToServer(key fromId, string fromName, string message)
{
    string body = "{\"action\":\"IM_RECEIVED\","
        + "\"uuid\":\"" + (string)gOwner + "\","
        + "\"name\":\"" + gOwnerName + "\","
        + "\"data\":{\"from\":\"" + (string)fromId + "\","
        + "\"fromName\":\"" + llEscapeURL(fromName) + "\","
        + "\"message\":\"" + llEscapeURL(message) + "\"}}";
    llHTTPRequest(SERVER_URL + "/api/sl/bridge", [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_BODY_MAXLENGTH, 2048
    ], body);
}

// Send an SL instant message to a target avatar
sendIM(key target, string message)
{
    if (target == NULL_KEY) return;
    llInstantMessage(target, "📱 [Digital Dream] " + gOwnerName + ": " + message);
    // Also notify the owner
    llMessageLinked(LINK_SET, CH_NOTIFY, "IM_SENT|" + (string)target + "|" + message, gOwner);
}

// Parse JSON-like response for pending actions
// Format: {"actions":[{"target":"uuid","message":"text"}, ...]}
// Simple LSL JSON parsing (no llJson* for compatibility)
list parseActions(string body)
{
    list actions = [];
    integer i = llSubStringIndex(body, "\"target\"");
    while (i != -1)
    {
        // Extract target UUID
        integer ts = llSubStringIndex(body, "\"target\":\"") + 10;
        integer te = llSubStringIndex(llGetSubString(body, ts, -1), "\"") + ts;
        string target = llGetSubString(body, ts, te - 1);

        // Extract message
        integer ms = llSubStringIndex(body, "\"message\":\"") + 11;
        integer me = llSubStringIndex(llGetSubString(body, ms, -1), "\"") + ms;
        string message = llGetSubString(body, ms, me - 1);

        if (target != "" && message != "")
        {
            actions += [target, llUnescapeURL(message)];
        }

        // Move past this action
        body = llGetSubString(body, me + 1, -1);
        i = llSubStringIndex(body, "\"target\"");
    }
    return actions;
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
        llOwnerSay("💬 Messenger module ready.");
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
        if (num == CH_MESSENGER)
        {
            if (msg == "START")
            {
                startPolling();
            }
            else if (msg == "STOP")
            {
                stopPolling();
            }
            else if (llGetSubString(msg, 0, 7) == "SEND_IM:")
            {
                // "SEND_IM:target_uuid:message text"
                string payload = llGetSubString(msg, 8, -1);
                integer sep = llSubStringIndex(payload, ":");
                if (sep > 0)
                {
                    key target = (key)llGetSubString(payload, 0, sep - 1);
                    string message = llGetSubString(payload, sep + 1, -1);
                    sendIM(target, message);
                }
            }
            else if (llGetSubString(msg, 0, 10) == "FORWARD_IM:")
            {
                // Forward an externally received IM to backend
                // "FORWARD_IM:from_uuid:from_name:message"
                string payload = llGetSubString(msg, 11, -1);
                list parts = llParseString2List(payload, [":"], []);
                if (llGetListLength(parts) >= 3)
                {
                    key fromId = (key)llList2String(parts, 0);
                    string fromName = llList2String(parts, 1);
                    string message = llList2String(parts, 2);
                    forwardImToServer(fromId, fromName, message);
                }
            }
        }
    }

    timer()
    {
        if (gActive)
        {
            pollServer();
        }
    }

    http_response(key req, integer status, list meta, string body)
    {
        if (req == gPollRequest)
        {
            gPollRequest = NULL_KEY;
            if (status != 200) return;

            // Parse pending actions from server
            list actions = parseActions(body);
            integer count = llGetListLength(actions);
            integer i;
            for (i = 0; i < count; i += 2)
            {
                key target = (key)llList2String(actions, i);
                string message = llList2String(actions, i + 1);
                sendIM(target, message);
            }
        }
    }
}
