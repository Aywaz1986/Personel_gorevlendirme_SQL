using System.Text.Json;

namespace Gorevlendirme;

/// <summary>Komut bağımsız değişkenlerini güvenle okur (eksik veya yanlış türde ise varsayılan).</summary>
public static class Args
{
    public static string S(JsonElement a, string k, string d = "") =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String
            ? v.GetString() ?? d : d;

    public static int I(JsonElement a, string k, int d = 0) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v)
            && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n) ? n : d;

    public static bool B(JsonElement a, string k, bool d = false) =>
        a.ValueKind == JsonValueKind.Object && a.TryGetProperty(k, out var v)
            && (v.ValueKind == JsonValueKind.True || v.ValueKind == JsonValueKind.False) ? v.GetBoolean() : d;
}
