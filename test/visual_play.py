# Guffhead: play a whole game against both house players in a phone-sized browser, tapping like a person, and
# screenshot the table, the catch-up stage, and the end (the 💩 landing). python3 test/visual_play.py
import os
from playwright.sync_api import sync_playwright
BASE = os.environ.get("BASE", "http://127.0.0.1:8799")
OUT = os.path.join(os.path.dirname(__file__), "shots")
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg.add_init_script("localStorage.setItem('gh:look-asked', '1'); localStorage.setItem('gh:how-seen', '1')")   # the one-off look picker has its own check
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" and "fonts.g" not in m.text else None)
    pg.goto(BASE + "/"); pg.fill("#name", "steve"); pg.fill("#pin", "3456"); pg.click("button[type=submit]")
    pg.wait_for_selector(".lobby")
    pg.click("[data-crew=guffbot]"); pg.wait_for_timeout(150); pg.click("[data-crew=msguffbot]"); pg.wait_for_timeout(150)
    pg.click("#deal"); pg.wait_for_selector("#skipDeal"); pg.click("#skipDeal"); pg.wait_for_selector("#botPick"); pg.click("#botPick"); pg.click("#readyBtn")
    shot_stage = shot_table = False
    for i in range(400):
        pg.wait_for_timeout(250)
        if pg.locator(".stagecard").count() and not shot_stage:
            pg.screenshot(path=f"{OUT}/7-stage.png"); shot_stage = True
        if pg.locator(".final").count():
            pg.wait_for_timeout(500)
            pg.screenshot(path=f"{OUT}/9-final.png", full_page=True)
            break
        if pg.locator(".stagecard").count():
            continue
        cards = pg.locator(".mine [data-card]:not(.dim)")
        if pg.locator("#playBtn").count() and cards.count():
            if i > 6 and not shot_table:
                cards.first.click(position={"x": 8, "y": 24}); pg.wait_for_timeout(200)
                pg.screenshot(path=f"{OUT}/8-table.png"); shot_table = True
            else:
                cards.first.click(position={"x": 8, "y": 24}); pg.wait_for_timeout(100)
            if pg.locator("#playBtn:not([disabled])").count(): pg.click("#playBtn")
        elif pg.locator("#pickBtn").count():
            pg.click("#pickBtn")
        elif pg.locator("[data-down]").count():
            pg.locator("[data-down]").first.click()
    print("errors:", errors, "stage:", shot_stage, "table:", shot_table)
    b.close()
