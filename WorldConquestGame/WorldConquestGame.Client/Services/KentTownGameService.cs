using System;
using System.Collections.Generic;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Client.Services
{
    public class KentTownGameService
    {
        public List<Country> Towns { get; set; } = new List<Country>();
        public List<Player> Players { get; set; } = new List<Player>();
        public event Action<string>? TownConquered;
        public event Action? ResetRequested;
        public event Action? TownsLoaded;

        public void RaiseTownClicked(string id)
        {
            var town = Towns.Find(t => t.Code == id || t.Name == id);
            if (town != null && !town.IsConquered)
            {
                town.IsConquered = true;
                TownConquered?.Invoke(id);
            }
        }

        public void RequestReset()
        {
            ResetRequested?.Invoke();
        }

        public void NotifyTownsLoaded()
        {
            TownsLoaded?.Invoke();
        }

        public void MergePersistedTowns(List<Country> persisted)
        {
            foreach (var p in persisted)
            {
                var match = Towns.Find(t => t.Code == p.Code);
                if (match != null)
                {
                    match.IsConquered = p.IsConquered;
                    match.Owner = p.Owner;
                    match.Color = p.Color;
                }
            }
        }
    }
}
