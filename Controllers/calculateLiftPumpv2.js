const calculateLiftPumpv2 = (req, res) => {
  try {
    const {
      h_suction_ft,
      L_suc_ft,
      D_suc_in,
      mat_suc,
      elbows_suc,
      valves_suc,
      h_dis_ft,
      L_dis_ft,
      D_dis_in,
      mat_dis,
      elbows_dis,
      valves_dis,
      tank_shape,
      tank_L_ft,
      tank_W_ft,
      tank_H_ft,
      tank_D_ft,
      tank_Hc_ft,
      bathrooms,
      kitchens,
      washing_machines,
      q_peak_manual,
      fill_mode,
      refill_min,
      pump_efficiency,
      motor_efficiency,
      safety_factor,
    } = req.body;

    // Constants
    const EPS = { "uPVC/cPVC": 0.0015e-3, PPR: 0.007e-3, GI: 0.150e-3 };
    const g = 9.80665;
    const FT_TO_M = 0.3048;

    // Validation
    const requiredFields = [
      'h_suction_ft',
      'L_suc_ft',
      'D_suc_in',
      'h_dis_ft',
      'L_dis_ft',
      'D_dis_in',
      'bathrooms',
      'kitchens',
      'washing_machines',
      'refill_min',
      'pump_efficiency',
      'motor_efficiency',
    ];
    const tankFields = tank_shape === 'rect' ? ['tank_L_ft', 'tank_W_ft', 'tank_H_ft'] : ['tank_D_ft', 'tank_Hc_ft'];

    // for (const field of [...requiredFields, ...tankFields]) {
    //   if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
    //     throw new Error(`Missing required field: ${field}`);
    //   }
    //   if (isNaN(parseFloat(req.body[field])) || parseFloat(req.body[field]) < 0) {
    //     throw new Error(`Invalid value for ${field}. Must be a non-negative number.`);
    //   }
    // }

    if (!['uPVC/cPVC', 'PPR', 'GI'].includes(mat_suc) || !['uPVC/cPVC', 'PPR', 'GI'].includes(mat_dis)) {
      throw new Error('Invalid pipe material.');
    }
    if (!['rect', 'cyl'].includes(tank_shape)) {
      throw new Error('Invalid tank shape.');
    }
    if (!['maintain', 'refill', 'both', 'matchdrain'].includes(fill_mode)) {
      throw new Error('Invalid fill strategy.');
    }
    if (!['1.15', '1.25', '1.30', '1.50'].includes(safety_factor)) {
      throw new Error('Invalid safety factor.');
    }

    // Parse inputs
    const h_suction_m = parseFloat(h_suction_ft) * FT_TO_M;
    const L_suc_m = parseFloat(L_suc_ft) * FT_TO_M;
    const D_suc_m = parseFloat(D_suc_in) * 0.0254;
    const eps_suc = EPS[mat_suc] || EPS['uPVC/cPVC'];
    const elbows_suc_count = parseFloat(elbows_suc) || 0;
    const valves_suc_count = parseFloat(valves_suc) || 0;

    const h_dis_m = parseFloat(h_dis_ft) * FT_TO_M;
    const L_dis_m = parseFloat(L_dis_ft) * FT_TO_M;
    const D_dis_m = parseFloat(D_dis_in) * 0.0254;
    const eps_dis = EPS[mat_dis] || EPS['uPVC/cPVC'];
    const elbows_dis_count = parseFloat(elbows_dis) || 0;
    const valves_dis_count = parseFloat(valves_dis) || 0;

    const tank_L_m = parseFloat(tank_L_ft) * FT_TO_M;
    const tank_W_m = parseFloat(tank_W_ft) * FT_TO_M;
    const tank_H_m = parseFloat(tank_H_ft) * FT_TO_M;
    const tank_D_m = parseFloat(tank_D_ft) * FT_TO_M;
    const tank_Hc_m = parseFloat(tank_Hc_ft) * FT_TO_M;

    const b = parseFloat(bathrooms) || 0;
    const k = parseFloat(kitchens) || 0;
    const wm = parseFloat(washing_machines) || 0;
    const q_peak_manual_num = q_peak_manual && q_peak_manual.trim() !== '' ? parseFloat(q_peak_manual) : null;
    const t_min = Math.max(1, parseFloat(refill_min));
    const pe = Math.max(0.01, Math.min(0.95, parseFloat(pump_efficiency) / 100));
    const me = Math.max(0.01, Math.min(0.98, parseFloat(motor_efficiency) / 100));
    const SF = parseFloat(safety_factor);

    // Tank volume
    const V_m3 = tank_shape === 'rect' ? tank_L_m * tank_W_m * tank_H_m : Math.PI * Math.pow(tank_D_m / 2, 2) * tank_Hc_m;
    const V_L = Math.max(0, V_m3 * 1000);

    // Demand
    const q_est = b * 9 + k * 6 + wm * 10;
    const q_peak = q_peak_manual_num !== null ? Math.max(0, q_peak_manual_num) : (q_est > 0 ? q_est : 0);
    const q_refill = V_L / t_min;
    let Q_lpm;
    if (fill_mode === 'refill') Q_lpm = q_refill;
    else if (fill_mode === 'both') Q_lpm = q_peak + q_refill;
    else if (fill_mode === 'matchdrain') Q_lpm = 2 * q_peak;
    else Q_lpm = q_peak;

    if (Q_lpm <= 0) {
      throw new Error('Design flow must be greater than 0 L/min.');
    }
    if (D_suc_m <= 0 || D_dis_m <= 0) {
      throw new Error('Pipe diameters must be greater than 0.');
    }

    const Q_m3s = Q_lpm / 1000 / 60;

    // Suction calculations
    const As = Math.PI * Math.pow(D_suc_m / 2, 2);
    const vs = D_suc_m > 0 ? Q_m3s / As : 0;
    const Res = D_suc_m > 0 ? vs * D_suc_m / 1e-6 : 1e6;
    const fs = D_suc_m > 0 ? (Res < 2000 ? 64 / Math.max(Res, 1e-6) : 0.25 / Math.pow(Math.log((eps_suc / D_suc_m / 3.7) + 5.74 / Math.pow(Res, 0.9)) / Math.LN10, 2)) : 0;
    const h_fs = D_suc_m > 0 ? fs * (L_suc_m / D_suc_m) * (vs * vs / (2 * g)) : 0;
    const Ks_total = 0.5 + elbows_suc_count * 0.9 + valves_suc_count * 0.2 + 1.5; // entry + elbows + valve + strainer
    const h_ms = vs > 0 ? Ks_total * (vs * vs / (2 * g)) : 0;

    // Discharge calculations
    const Ad = Math.PI * Math.pow(D_dis_m / 2, 2);
    const vd = D_dis_m > 0 ? Q_m3s / Ad : 0;
    const Red = D_dis_m > 0 ? vd * D_dis_m / 1e-6 : 1e6;
    const fd = D_dis_m > 0 ? (Red < 2000 ? 64 / Math.max(Red, 1e-6) : 0.25 / Math.pow(Math.log((eps_dis / D_dis_m / 3.7) + 5.74 / Math.pow(Red, 0.9)) / Math.LN10, 2)) : 0;
    const h_fd = D_dis_m > 0 ? fd * (L_dis_m / D_dis_m) * (vd * vd / (2 * g)) : 0;
    const Kd_total = elbows_dis_count * 0.9 + valves_dis_count * (0.2 + 0.6) + 1.0; // elbows + (valve+tee) + exit
    const h_md = vd > 0 ? Kd_total * (vd * vd / (2 * g)) : 0;

    // TDH
    let TDH = h_dis_m + (h_fs + h_ms) + (h_fd + h_md) - h_suction_m;
    if (TDH < 0) TDH = 0;

    // Power
    const P_hyd = 1000 * g * Q_m3s * TDH;
    const P_in = P_hyd / (pe * me);
    const HP = P_in / 746;
    const HP_sf = HP * SF;

    // Drain time
    const t_drain = q_peak > 0 ? V_L / q_peak : Infinity;

    res.status(200).json({
      success: true,
      results: {
        type: 'liftpump',
        
        // Tank Volume & Drain Time
        tank_volume_drain_time: {
          tank_volume_L: Math.round(V_L),
          peak_draw_estimate_L_min: Math.round(q_est),
          manual_peak_override_L_min: q_peak_manual_num !== null ? Math.round(q_peak_manual_num) : null,
          drain_time_at_peak_min: Math.round(t_drain)
        },

        // Design Flow
        design_flow: {
          strategy: fill_mode,
          refill_only_rate_L_min: Math.round(q_refill),
          refill_target_min: t_min,
          chosen_design_flow_L_min: Math.round(Q_lpm)
        },

        // Heads
        heads: {
          static_suction_head_m: Math.round(h_suction_m * 100) / 100,
          suction_friction_m: Math.round(h_fs * 100) / 100,
          suction_minor_loss_m: Math.round(h_ms * 100) / 100,
          discharge_elevation_m: Math.round(h_dis_m * 100) / 100,
          discharge_friction_m: Math.round(h_fd * 100) / 100,
          discharge_minor_loss_m: Math.round(h_md * 100) / 100,
          total_dynamic_head_m: Math.round(TDH * 100) / 100
        },

        // Velocities
        velocities: {
          suction_velocity_m_s: Math.round(vs * 100) / 100,
          suction_velocity_aim: "≤ 1.5 m/s",
          discharge_velocity_m_s: Math.round(vd * 100) / 100,
          discharge_velocity_aim: "0.6-2.0 m/s"
        },

        // Power
        power: {
          hydraulic_power_kW: Math.round(P_hyd / 1000 * 100) / 100,
          motor_input_power_kW: Math.round(P_in / 1000 * 100) / 100,
          motor_input_power_HP: Math.round(HP * 100) / 100,
          with_safety_factor_x: SF,
          final_power_HP: Math.round(HP_sf * 100) / 100
        }
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export { calculateLiftPumpv2 };