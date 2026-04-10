import React from 'react';
import {
  DEFAULT_CAMPAIGN_SETTINGS,
} from '@engine/index';

/**
 * Static reference page explaining how the loot system works.
 * Content distilled from DESIGN.md per STEPPER-DESIGN.md §About Tab.
 */
const About: React.FC = () => {
  const roleRatios = DEFAULT_CAMPAIGN_SETTINGS.roleRatios;

  return (
    <article className="about-page">
      <h1>About the Loot Generator</h1>

      <section>
        <h2>What This Is</h2>
        <p>
          A unified loot generation system for D&amp;D 5e that replaces the
          DMG&apos;s big hoard tables with <em>per-creature probability</em>.
          Every monster you kill has a chance of dropping something — a few
          copper, a gem, an art object, or a magic item — scaled to its
          Challenge Rating and its role in the encounter. Over a full tier of
          play the numbers land in roughly the same place the DMG expects, but
          the rewards arrive in a rhythm the players can feel at the table.
        </p>
      </section>

      <section>
        <h2>How the Math Works</h2>
        <p>
          Each creature starts with its XP value from the Monster Manual. That
          XP is multiplied by a <strong>gp-per-xp ratio</strong> specific to
          its tier of play, yielding a gold-piece budget. That budget is then
          scaled by the creature&apos;s <strong>role</strong> — the fraction
          of its budget that actually becomes loot.
        </p>
        <table className="about-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Share</th>
              <th>Typical Creature</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Minion</td>
              <td>{Math.round(roleRatios.minion * 100)}%</td>
              <td>Goblin, thug, kobold</td>
            </tr>
            <tr>
              <td>Elite</td>
              <td>{Math.round(roleRatios.elite * 100)}%</td>
              <td>Ogre, veteran, hobgoblin captain</td>
            </tr>
            <tr>
              <td>Boss</td>
              <td>{Math.round(roleRatios.boss * 100)}%</td>
              <td>Adult dragon, beholder, lich</td>
            </tr>
            <tr>
              <td>Vault</td>
              <td>{Math.round(roleRatios.vault * 100)}%</td>
              <td>A full hoard with no owner</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Category Breakdown</h2>
        <p>
          A creature&apos;s budget is split across four categories: coins,
          gems, art objects, and magic items. The split is tier-specific and
          derived from the DMG hoard tables: at tier 1 most of the value lives
          in coins and the cheapest magic item tables; at tier 4 it&apos;s
          dominated by Tables H and I. Each category rolls against a table
          sized to the tier — you never roll a 5,000 gp gem at tier 1.
        </p>
      </section>

      <section>
        <h2>Magic Item Tables</h2>
        <p>
          The DMG organizes magic items into nine tables labelled A through I.
          A/B/C are the minor tables (potions, scrolls, common gear); D/E are
          their "Major" counterparts with rarer items. F/G/H/I are the "martial
          adventurer" tables — weapons, armor, and signature wondrous items
          whose average value climbs from 500 gp up to 500,000 gp.
        </p>
        <p>
          On top of the tables we add a <strong>value score</strong> pricing
          layer: when an item is picked, we roll 2d4 and multiply by the
          table&apos;s base number to get an individualized buy price. A
          longsword +1 and a wand of fireballs can both come off Table G but
          they cost wildly different amounts — the value score captures that
          spread without requiring a hand-priced database.
        </p>
      </section>

      <section>
        <h2>DMG Balance Verification</h2>
        <p>
          At default settings, a full tier&apos;s worth of encounters produces
          treasure totals that match the DMG&apos;s expected hoard values to
          within a few percent. The engine&apos;s{' '}
          <code>economy-balance</code> test suite runs every category of drop
          across a statistically meaningful sample and asserts that the totals
          fall inside the DMG envelope. You can trust that tuning a campaign
          to these defaults won&apos;t quietly break the math.
        </p>
      </section>
    </article>
  );
};

export default About;
