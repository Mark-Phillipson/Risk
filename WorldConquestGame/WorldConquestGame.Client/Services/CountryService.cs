using System.Net.Http.Json;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services;

public class CountryService
{
    private readonly HttpClient _http;

    public CountryService(HttpClient http)
    {
        _http = http;
    }

    public async Task<List<Country>> GetAllAsync()
    {
        // Placeholder: return empty list or fetch from REST Countries API
        return new List<Country>();
    }
}
