using System.Diagnostics;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;

namespace Gorevlendirme;

/// <summary>
/// Arayüz (JavaScript) ile C# arasındaki köprü. İstek: {id, cmd, args}; yanıt: {id, ok, ms, data} veya {id, ok:false, code, error}.
/// </summary>
public class Bridge
{
    private readonly CoreWebView2 _wv;
    private readonly AppState _state;
    private readonly CommandRegistry _reg;

    public Bridge(CoreWebView2 wv, AppState state, CommandRegistry reg)
    {
        _wv = wv; _state = state; _reg = reg;
    }

    public async Task HandleAsync(string json)
    {
        int id = 0;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            id = root.GetProperty("id").GetInt32();
            var cmd = root.GetProperty("cmd").GetString() ?? "";
            var args = root.TryGetProperty("args", out var a) ? a.Clone() : default;

            var entry = _reg.Find(cmd) ?? throw new GorevException("komut", "Bilinmeyen komut: " + cmd);
            if (entry.KapiGerekli && _state.Engel is not null)
                throw new GorevException("surum", _state.Engel);
            var sw = Stopwatch.StartNew();
            var data = await entry.Handler(_state, args);
            Reply(new { id, ok = true, ms = sw.ElapsedMilliseconds, data });
        }
        catch (GorevException ex)
        {
            Reply(new { id, ok = false, code = ex.Code, error = ex.Message });
        }
        catch (Exception ex)
        {
            Reply(new { id, ok = false, code = "hata", error = ex.Message });
        }
    }

    private void Reply(object o) => _wv.PostWebMessageAsJson(JsonSerializer.Serialize(o));
}
