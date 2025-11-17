
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services
{
    public class KentTownService
    {
        private readonly HttpClient _httpClient;
        // Removed shared Towns property to avoid caching subset

        public KentTownService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<List<Country>> GetAllAsync()
        {
            var towns = new List<Country>();
            var path = "data/kent-towns-villages.geojson";
            try
            {
                var json = await _httpClient.GetStringAsync(path);
                using var doc = JsonDocument.Parse(json);
                var features = doc.RootElement.GetProperty("features");
                foreach (var feature in features.EnumerateArray())
                {
                    var props = feature.GetProperty("properties");
                    var name = props.GetProperty("name").GetString() ?? string.Empty;
                    var code = name; // Use name as code for simplicity
                    if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(code))
                    {
                        towns.Add(new Country { Name = name, Code = code });
                    }
                }
            }
            catch(Exception exception)
            {
                Console.WriteLine($"[KentTownService] Exception loading towns: {exception}");
            }
            return towns;
        }
    }
}
