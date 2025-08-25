namespace WorldConquestGame.Shared.Models;

public class Country
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Capital { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string FlagUrl { get; set; } = string.Empty;
    public bool IsConquered { get; set; } = false;
    public string? Owner { get; set; } = null;
}
