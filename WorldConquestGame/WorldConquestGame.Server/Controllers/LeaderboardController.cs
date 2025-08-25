using Microsoft.AspNetCore.Mvc;

namespace WorldConquestGame.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { message = "Leaderboard not implemented" });
}
