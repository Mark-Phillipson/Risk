using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services;

public class GameService
{
    public List<Player> Players { get; set; } = new();
    public List<Country> Countries { get; set; } = new();

    // Event raised when a country is clicked on the map
    public event Action<string>? CountryClicked;
    // Event raised when a country is conquered
    public event Action<string>? CountryConquered;

    private int TurnIndex = 0;
    public Player CurrentPlayer => Players[TurnIndex % Players.Count];

    public void NextTurn() => TurnIndex++;

    public void ConquerCountry(string countryCode, Player player)
    {
        var country = Countries.FirstOrDefault(c => c.Code == countryCode);
        if (country != null)
        {
            country.Owner = player.Name;
            country.IsConquered = true;
            // keep Color property untouched here; UI layer chooses color
        }
    }

    // Merge persisted country state into the in-memory list (match by Code)
    public void MergePersistedCountries(IEnumerable<Country> persisted)
    {
        if (persisted == null) return;
        foreach (var p in persisted)
        {
            if (string.IsNullOrEmpty(p.Code)) continue;
            var match = Countries.FirstOrDefault(c => string.Equals(c.Code, p.Code, StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                match.IsConquered = p.IsConquered;
                match.Owner = p.Owner;
                match.Color = p.Color;
                if (!string.IsNullOrEmpty(p.Capital)) match.Capital = p.Capital;
                if (!string.IsNullOrEmpty(p.Name)) match.Name = p.Name; // Set name if available
            }
            else
            {
                // If not in list, add a minimal record so UI can apply styles by code
                Countries.Add(new Country
                {
                    Code = p.Code,
                    Name = p.Name ?? string.Empty,
                    IsConquered = p.IsConquered,
                    Owner = p.Owner,
                    Color = p.Color,
                    Capital = p.Capital ?? string.Empty
                });
            }
        }
    }

    public void RaiseCountryClicked(string id)
    {
        CountryClicked?.Invoke(id);
    }

    public void RaiseCountryConquered(string id)
    {
        // Mark in-memory model as conquered by current player if countries are loaded
        if (!string.IsNullOrEmpty(id) && Players != null && Players.Count > 0)
        {
            try
            {
                ConquerCountry(id, CurrentPlayer);
            }
            catch { /* ignore failures - this is best-effort */ }
        }

        CountryConquered?.Invoke(id);
    }
}
