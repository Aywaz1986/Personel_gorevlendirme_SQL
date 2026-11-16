using System.Text.Json;

namespace Gorevlendirme;

public delegate Task<object?> CommandHandler(AppState state, JsonElement args);

/// <summary>Arayüzün çağırabildiği adlandırılmış komutlar. Ham SQL kabul edilmez.</summary>
public class CommandRegistry
{
    public record Entry(CommandHandler Handler, bool KapiGerekli);

    private readonly Dictionary<string, Entry> _map = new(StringComparer.Ordinal);

    /// <param name="kapiGerekli">true: sürüm kapısı engelliyse (eski exe / yeni şema) komut çalışmaz.</param>
    public void Register(string name, CommandHandler handler, bool kapiGerekli = false)
    {
        if (!_map.TryAdd(name, new Entry(handler, kapiGerekli)))
            throw new InvalidOperationException("Komut zaten kayıtlı: " + name);
    }

    public Entry? Find(string name) => _map.TryGetValue(name, out var e) ? e : null;

    public IReadOnlyCollection<string> Names => _map.Keys;
}
