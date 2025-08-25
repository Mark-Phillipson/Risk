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
        }
    }

    public void RaiseCountryClicked(string id)
    {
        CountryClicked?.Invoke(id);
    }

    public void RaiseCountryConquered(string id)
    {
        CountryConquered?.Invoke(id);
    }
}
