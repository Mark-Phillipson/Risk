using System;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.JSInterop;
using Xunit;
using WorldConquestGame.Client.Services;
using WorldConquestGame.Shared.Models;

namespace ClientStorageTests
{
    // Minimal fake IJSRuntime that stores items in-memory to emulate localStorage behavior
    class FakeJsRuntime : IJSRuntime
    {
        private readonly Dictionary<string, string?> _store = new();

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, object?[]? args)
        {
            // handle getItem / setItem / removeItem
            if (identifier == "localStorage.getItem")
            {
                var key = args?[0]?.ToString() ?? string.Empty;
                _store.TryGetValue(key, out var val);
                return ValueTask.FromResult((TValue)(object?)val);
            }
            if (identifier == "localStorage.setItem")
            {
                var key = args?[0]?.ToString() ?? string.Empty;
                var value = args?[1]?.ToString();
                _store[key] = value;
                return ValueTask.FromResult(default(TValue)!);
            }
            if (identifier == "localStorage.removeItem")
            {
                var key = args?[0]?.ToString() ?? string.Empty;
                _store.Remove(key);
                return ValueTask.FromResult(default(TValue)!);
            }

            throw new NotImplementedException(identifier);
        }

        public ValueTask<TValue> InvokeAsync<TValue>(string identifier, CancellationToken cancellationToken, object?[]? args)
            => InvokeAsync<TValue>(identifier, args);
    }

    public class StorageServiceTests
    {
        [Fact]
        public async Task SaveAndLoadCountries_RoundTrip_Works()
        {
            var js = new FakeJsRuntime();
            var storage = new StorageService(js);

            var countries = new List<Country>
            {
                new Country { Code = "USA", Name = "United States", IsConquered = true, Owner = "Player1", Color = "#ff0000", Capital = "Washington" },
                new Country { Code = "CAN", Name = "Canada", IsConquered = false, Owner = null, Color = null, Capital = "Ottawa" }
            };

            await storage.SaveCountriesAsync(countries);

            var loaded = await storage.LoadCountriesAsync();

            Assert.NotNull(loaded);
            Assert.Contains(loaded, c => c.Code == "USA" && c.IsConquered && c.Color == "#ff0000" && c.Capital == "Washington");
            Assert.Contains(loaded, c => c.Code == "CAN" && !c.IsConquered && c.Capital == "Ottawa");
        }

        [Fact]
        public async Task ClearCountries_RemovesData()
        {
            var js = new FakeJsRuntime();
            var storage = new StorageService(js);

            var countries = new List<Country> { new Country { Code = "X", IsConquered = true } };
            await storage.SaveCountriesAsync(countries);
            var loaded = await storage.LoadCountriesAsync();
            Assert.NotEmpty(loaded);

            await storage.ClearCountriesAsync();
            var after = await storage.LoadCountriesAsync();
            Assert.Empty(after);
        }
    }
}
