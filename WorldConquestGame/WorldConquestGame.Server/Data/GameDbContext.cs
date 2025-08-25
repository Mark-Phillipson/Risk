using Microsoft.EntityFrameworkCore;
using WorldConquestGame.Shared.Models;

namespace WorldConquestGame.Server.Data;

public class GameDbContext : DbContext
{
    public GameDbContext(DbContextOptions<GameDbContext> options) : base(options) { }

    public DbSet<Country> Countries => Set<Country>();
}
