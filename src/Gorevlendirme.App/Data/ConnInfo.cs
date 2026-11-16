namespace Gorevlendirme;

/// <summary>Bağlantı bilgisi. Yalnızca Windows kimliği kullanılır; parola/kullanıcı adı tutulmaz.</summary>
public record ConnInfo(
    string Server, string Database, bool WindowsAuth,
    string User, string Password, bool Encrypt, bool Trust);
