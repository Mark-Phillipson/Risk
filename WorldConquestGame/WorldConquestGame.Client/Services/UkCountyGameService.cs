using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services;

public class UkCountyGameService
{
    public List<Player> Players { get; set; } = new();
    public List<Country> Counties { get; set; } = new();

    public event Action<string>? CountyClicked;
    public event Action<string>? CountyConquered;
    // Request to reset/clear all uk-county progress (subscribers should clear UI/state)
    public event Action? ResetRequested;

    private int TurnIndex = 0;
    public Player CurrentPlayer => Players[TurnIndex % Math.Max(1, Players.Count)];

    public void NextTurn() => TurnIndex++;

    public void ConquerCounty(string countyCode, Player player)
    {
        var county = Counties.FirstOrDefault(c => string.Equals(c.Code, countyCode, StringComparison.OrdinalIgnoreCase));
        if (county != null)
        {
            county.Owner = player.Name;
            county.IsConquered = true;
        }
    }

    public void MergePersistedCounties(IEnumerable<Country> persisted)
    {
        if (persisted == null) return;
        foreach (var item in persisted)
        {
            if (string.IsNullOrWhiteSpace(item.Code)) continue;
            var match = Counties.FirstOrDefault(c => string.Equals(c.Code, item.Code, StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                match.IsConquered = item.IsConquered;
                match.Owner = item.Owner;
                match.Color = item.Color;
                if (!string.IsNullOrEmpty(item.Capital)) match.Capital = item.Capital;
            }
            else
            {
                Counties.Add(new Country
                {
                    Code = item.Code,
                    Name = item.Name,
                    IsConquered = item.IsConquered,
                    Owner = item.Owner,
                    Color = item.Color,
                    Capital = item.Capital ?? string.Empty,
                    Region = item.Region
                });
            }
        }
    }

    public void RaiseCountyClicked(string id)
    {
        CountyClicked?.Invoke(id);
    }

    public void RaiseCountyConquered(string id)
    {
        if (!string.IsNullOrEmpty(id) && Players != null && Players.Count > 0)
        {
            try
            {
                ConquerCounty(id, CurrentPlayer);
            }
            catch
            {
            }
        }

        CountyConquered?.Invoke(id);
    }

    public void RequestReset()
    {
        try { ResetRequested?.Invoke(); } catch { }
    }
}
